import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma, PrismaClient, User } from '@prisma/client';
import { IntentInput, OfferInput, ProductInput, CampaignInput, normalizeSlug } from '@junta/validation';
const cents=(value:Prisma.Decimal)=>Number(value.mul(100).toFixed(0));
const decimal=(value:number)=>new Prisma.Decimal(value).div(100);
export class PlatformService{
  constructor(readonly db:PrismaClient){}
  async products(q='',page=1){
    const where={active:true,...(q?{name:{contains:q.trim(),mode:'insensitive' as const}}:{})};
    const [items,total]=await this.db.$transaction([this.db.product.findMany({where,include:{variants:{include:{pools:true,offers:{where:{active:true,startsAt:{lte:new Date()},endsAt:{gt:new Date()}},include:{merchant:true}}}}},orderBy:{name:'asc'},take:24,skip:(page-1)*24}),this.db.product.count({where})]);
    return {items:items.map(p=>({...p,variants:p.variants.map(v=>({...v,demoPriceCents:cents(v.demoPrice),demand:v.pools.reduce((a,p)=>a+p.count,0),offers:v.offers.map(o=>({...o,priceCents:cents(o.price)}))}))})),total,page};
  }
  async product(slug:string){
    const product=await this.db.product.findUnique({where:{slug},include:{variants:{include:{pools:true,offers:{where:{active:true,startsAt:{lte:new Date()},endsAt:{gt:new Date()}},include:{merchant:true}}}}}});
    if(!product?.active)throw new NotFoundException('Produto não encontrado');
    return {...product,variants:product.variants.map(v=>({...v,demoPriceCents:cents(v.demoPrice),demand:v.pools.reduce((a,p)=>a+p.count,0),offers:v.offers.map(o=>({...o,priceCents:cents(o.price)}))}))};
  }
  async createIntent(user:User,input:IntentInput,key?:string){
    if(!key || key.length>100 || !/^[a-zA-Z0-9_-]+$/.test(key))throw new BadRequestException('Informe Idempotency-Key válida');
    return this.db.$transaction(async tx=>{
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.id}))`;
      const existing=await tx.purchaseIntent.findUnique({where:{userId_idempotencyKey:{userId:user.id,idempotencyKey:key}}});
      if(existing){if(existing.variantId!==input.variantId || existing.horizon!==input.horizon || cents(existing.targetPrice)!==input.targetCents)throw new ConflictException('Chave já usada com outros dados');return {...existing,targetCents:cents(existing.targetPrice)};}
      const variant=await tx.productVariant.findUnique({where:{id:input.variantId},include:{product:true}});
      if(!variant?.product.active)throw new NotFoundException('Produto indisponível');
      if(await tx.purchaseIntent.findFirst({where:{userId:user.id,variantId:input.variantId,active:true}}))throw new ConflictException('Você já participa deste produto');
      const intent=await tx.purchaseIntent.create({data:{userId:user.id,variantId:input.variantId,horizon:input.horizon,targetPrice:decimal(input.targetCents),idempotencyKey:key}});
      await tx.demandPool.upsert({where:{variantId_horizon:{variantId:input.variantId,horizon:input.horizon}},create:{variantId:input.variantId,horizon:input.horizon,count:1,targetTotal:decimal(input.targetCents)},update:{count:{increment:1},targetTotal:{increment:decimal(input.targetCents)}}});
      await tx.outboxEvent.create({data:{type:'purchase_intent.created',payload:{intentId:intent.id,userId:user.id,variantId:input.variantId}}});
      await tx.analyticsEvent.create({data:{userId:user.id,name:'intent.creation',properties:{intentId:intent.id,targetCents:input.targetCents}}});
      return {...intent,targetCents:input.targetCents};
    },{maxWait:15000,timeout:15000});
  }
  async cancelIntent(user:User,id:string){
    return this.db.$transaction(async tx=>{
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.id}))`;
      const intent=await tx.purchaseIntent.findUnique({where:{id}});
      if(!intent || intent.userId!==user.id)throw new NotFoundException();
      if(intent.active){
        await tx.purchaseIntent.update({where:{id},data:{active:false,cancelledAt:new Date()}});
        await tx.demandPool.update({where:{variantId_horizon:{variantId:intent.variantId,horizon:intent.horizon}},data:{count:{decrement:1},targetTotal:{decrement:intent.targetPrice}}});
        await tx.outboxEvent.create({data:{type:'purchase_intent.cancelled',payload:{intentId:id}}});
      }
      return {ok:true};
    });
  }
  async intents(user:User){return {items:(await this.db.purchaseIntent.findMany({where:{userId:user.id,active:true},include:{variant:{include:{product:true}}},orderBy:{createdAt:'desc'},take:100})).map(i=>({...i,targetCents:cents(i.targetPrice)}))};}
  async merchantScope(user:User,merchantId?:string){
    if(user.role==='ADMIN'){
      if(!merchantId)throw new BadRequestException('Selecione a loja');
      const merchant=await this.db.merchant.findUnique({where:{id:merchantId}});
      if(!merchant?.approved)throw new ForbiddenException('Loja não aprovada');return merchant.id;
    }
    if(user.role!=='MERCHANT')throw new ForbiddenException();
    const membership=await this.db.membership.findFirst({where:{userId:user.id,...(merchantId?{merchantId}:{}),merchant:{approved:true}},include:{merchant:true}});
    if(!membership)throw new ForbiddenException('Loja não autorizada');return membership.merchantId;
  }
  async publishOffer(user:User,input:OfferInput){
    const merchantId=await this.merchantScope(user,input.merchantId);
    if(new Date(input.endsAt)<=new Date())throw new BadRequestException('Oferta já expirada');
    const variant=await this.db.productVariant.findUnique({where:{id:input.variantId},include:{product:true}});
    if(!variant?.product.active)throw new NotFoundException('Produto indisponível');
    return this.db.$transaction(async tx=>{
      const offer=await tx.offer.create({data:{merchantId,variantId:input.variantId,price:decimal(input.priceCents),url:input.url,startsAt:new Date(input.startsAt),endsAt:new Date(input.endsAt)}});
      await tx.auditLog.create({data:{actorId:user.id,action:'offer.publish',resourceId:offer.id}});
      await tx.outboxEvent.create({data:{type:'offer.activated',availableAt:offer.startsAt,payload:{offerId:offer.id,variantId:offer.variantId}}});
      return {...offer,priceCents:input.priceCents};
    });
  }
  async disableOffer(user:User,id:string){
    const offer=await this.db.offer.findUnique({where:{id}});if(!offer)throw new NotFoundException();
    await this.merchantScope(user,offer.merchantId);
    return this.db.$transaction(async tx=>{await tx.offer.update({where:{id},data:{active:false}});await tx.auditLog.create({data:{actorId:user.id,action:'offer.disable',resourceId:id}});return {ok:true};});
  }
  async click(user:User,id:string){
    const offer=await this.db.offer.findFirst({where:{id,active:true,startsAt:{lte:new Date()},endsAt:{gt:new Date()},merchant:{approved:true},variant:{product:{active:true}}}});
    if(!offer)throw new NotFoundException('Oferta expirada ou indisponível');
    await this.db.analyticsEvent.create({data:{userId:user.id,name:'offer.click',properties:{offerId:id,merchantId:offer.merchantId}}});
    return {url:offer.url};
  }
  async createProduct(user:User,input:ProductInput,id?:string){
    const slug=normalizeSlug(input.name);if(!slug)throw new BadRequestException('Nome inválido');
    try{return await this.db.$transaction(async tx=>{
      const data={name:input.name,normalizedName:slug,slug,description:input.description,category:input.category,illustration:input.illustration};
      const product=id?await tx.product.update({where:{id},data}):await tx.product.create({data:{...data,variants:{create:{name:input.variantName,demoPrice:decimal(input.demoPriceCents)}}}});
      if(id){const variant=await tx.productVariant.findFirstOrThrow({where:{productId:id}});await tx.productVariant.update({where:{id:variant.id},data:{name:input.variantName,demoPrice:decimal(input.demoPriceCents)}});}
      await tx.auditLog.create({data:{actorId:user.id,action:id?'product.update':'product.create',resourceId:product.id}});return product;
    });}catch(e){if(e instanceof Prisma.PrismaClientKnownRequestError && e.code==='P2002')throw new ConflictException('Produto já cadastrado');throw e;}
  }
  async campaign(user:User,input:CampaignInput){return this.db.$transaction(async tx=>{const campaign=await tx.campaign.create({data:{...input,startsAt:new Date(input.startsAt),endsAt:new Date(input.endsAt)}});await tx.auditLog.create({data:{actorId:user.id,action:'campaign.create',resourceId:campaign.id}});return campaign;});}
  async overview(user:User){
    const merchantId=user.role==='MERCHANT'?await this.merchantScope(user):undefined;
    const [pools,offers,merchants,events,intents,campaigns]=await this.db.$transaction([
      this.db.demandPool.findMany({include:{variant:{include:{product:true}}},orderBy:{count:'desc'},take:100}),
      this.db.offer.findMany({where:merchantId?{merchantId}:{},include:{variant:{include:{product:true}},merchant:true},take:100,orderBy:{createdAt:'desc'}}),
      this.db.merchant.findMany({where:merchantId?{id:merchantId}:{},take:100}),
      this.db.analyticsEvent.groupBy({by:['name'],orderBy:{name:'asc'},where:{createdAt:{gte:new Date(Date.now()-30*86400000)},...(merchantId?{name:'offer.click',properties:{path:['merchantId'],equals:merchantId}}:{})},_count:true}),
      // Merchants receive aggregate demand only; never consumer identities or individual budgets.
      this.db.purchaseIntent.findMany({where:merchantId?{id:'__no_personal_data__'}:{},include:{variant:{include:{product:true}}},take:100,orderBy:{createdAt:'desc'}}),
      this.db.campaign.findMany({take:100,orderBy:{createdAt:'desc'}}),
    ]);
    return {pools,offers:offers.map(o=>({...o,priceCents:cents(o.price)})),merchants,events,intents:intents.map(i=>({...i,targetCents:cents(i.targetPrice)})),campaigns};
  }
  async deleteAccount(user:User){
    // Same per-user lock as intent creation prevents a new active intent during deletion.
    return this.db.$transaction(async tx=>{
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.id}))`;
      const intents=await tx.purchaseIntent.findMany({where:{userId:user.id,active:true}});
      for(const i of intents)await tx.demandPool.update({where:{variantId_horizon:{variantId:i.variantId,horizon:i.horizon}},data:{count:{decrement:1},targetTotal:{decrement:i.targetPrice}}});
      await tx.purchaseIntent.updateMany({where:{userId:user.id,active:true},data:{active:false,cancelledAt:new Date()}});
      await tx.session.deleteMany({where:{userId:user.id}});await tx.device.deleteMany({where:{userId:user.id}});await tx.notification.deleteMany({where:{userId:user.id}});await tx.passwordReset.deleteMany({where:{userId:user.id}});
      await tx.user.update({where:{id:user.id},data:{email:`deleted-${user.id}@invalid.local`,name:'Conta excluída',passwordHash:null,providerSubject:null,deletedAt:new Date(),preferences:{},referredBy:null}});
      await tx.analyticsEvent.updateMany({where:{userId:user.id},data:{userId:null,properties:{anonymized:true}}});
      return {ok:true};
    });
  }
}
