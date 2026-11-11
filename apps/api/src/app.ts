import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { NestFactory } from '@nestjs/core';
import { ArgumentsHost, BadRequestException, Body, Catch, Controller, Delete, ExceptionFilter, Get, Headers, HttpCode, HttpException, Module, Param, Patch, Post, Query, Req, Res } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder, ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { PrismaClient, Prisma } from '@prisma/client';
import Redis from 'ioredis';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import type { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { signupSchema, loginSchema, intentSchema, offerSchema, productSchema, campaignSchema, email, password } from '@junta/validation';
import { AuthService, publicUser } from './auth';
import { PlatformService } from './platform';
import { config } from './config';

@Catch()
class Errors implements ExceptionFilter{
  catch(error:unknown,host:ArgumentsHost){
    const response=host.switchToHttp().getResponse<Response>();
    let status=500,message='Não foi possível concluir a solicitação';
    if(error instanceof ZodError){status=400;message=error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; ');}
    else if(error instanceof HttpException){status=error.getStatus();message=error.message;}
    else if(error instanceof Prisma.PrismaClientKnownRequestError){if(error.code==='P2002'){status=409;message='Registro já existe';}if(error.code==='P2025'){status=404;message='Registro não encontrado';}}
    if(status===500)console.error(JSON.stringify({timestamp:new Date().toISOString(),level:'error',service:'junta-api',requestId:response.getHeader('X-Request-ID'),error:error instanceof Error?error.name:'unknown',code:error instanceof Prisma.PrismaClientKnownRequestError?error.code:undefined}));
    response.status(status).json({statusCode:status,message,requestId:response.getHeader('X-Request-ID')});
  }
}
const pageSchema=z.coerce.number().int().min(1).max(10000).default(1);
const bodyDoc=(schema:z.ZodType)=>ApiBody({schema:z.toJSONSchema(schema) as object});
export async function createApp(options:{db?:PrismaClient;logging?:boolean}={}){
  const settings=config(),db=options.db??new PrismaClient(),auth=new AuthService(db),platform=new PlatformService(db);
  const redis=new Redis(process.env.REDIS_URL??'redis://localhost:16379',{maxRetriesPerRequest:2,lazyConnect:true});
  await redis.connect();await db.$connect();
  function sessionResponse(result:Awaited<ReturnType<AuthService['session']>>,res:Response,req:Request){
    res.cookie('junta_refresh',result.refreshToken,{httpOnly:true,secure:settings.production,sameSite:settings.production?'none':'lax',path:'/auth',maxAge:30*86400000});
    // Browser clients never receive the refresh secret in JavaScript. Native clients have no Origin.
    return req.headers.origin?{accessToken:result.accessToken,user:result.user}:result;
  }
  @ApiTags('JUNTA')
  @ApiBearerAuth()
  @Controller()
  class Routes{
    @Get('health') health(){return {status:'ok',service:'junta-api'};}
    @Get('ready') async ready(){await db.$queryRaw`SELECT 1`;await redis.ping();return {status:'ready'};}
    @Post('auth/signup') @bodyDoc(signupSchema)
    async signup(@Body() body:unknown,@Res({passthrough:true}) res:Response,@Req() req:Request){return sessionResponse(await auth.signup(signupSchema.parse(body)),res,req);}
    @Post('auth/login') @HttpCode(200) @bodyDoc(loginSchema)
    async login(@Body() body:unknown,@Res({passthrough:true}) res:Response,@Req() req:Request){const data=loginSchema.parse(body);return sessionResponse(await auth.login(data.email,data.password),res,req);}
    @Post('auth/oauth/:provider') @HttpCode(200)
    async oauth(@Param('provider') provider:string,@Body() body:unknown,@Res({passthrough:true}) res:Response,@Req() req:Request){const input=z.object({idToken:z.string().min(1).max(10000)}).parse(body);return sessionResponse(await auth.oauth(z.enum(['google','apple']).parse(provider),input.idToken),res,req);}
    @Post('auth/refresh') @HttpCode(200)
    async refresh(@Body() body:unknown,@Req() req:Request,@Res({passthrough:true}) res:Response){const data=z.object({refreshToken:z.string().max(200).optional()}).parse(body??{});const token=req.headers.origin?req.cookies?.junta_refresh:data.refreshToken??req.cookies?.junta_refresh;if(typeof token!=='string')throw new BadRequestException('Sessão ausente');return sessionResponse(await auth.refresh(token),res,req);}
    @Post('auth/logout') @HttpCode(200)
    async logout(@Headers('authorization') token:string,@Res({passthrough:true}) res:Response){res.clearCookie('junta_refresh',{path:'/auth',secure:settings.production,sameSite:settings.production?'none':'lax'});return auth.logout(await auth.user(token));}
    @Post('auth/forgot') @HttpCode(200)
    forgot(@Body() body:unknown){return auth.forgot(z.object({email}).parse(body).email);}
    @Post('auth/reset') @HttpCode(200)
    reset(@Body() body:unknown){const data=z.object({token:z.string().min(10).max(200),password}).parse(body);return auth.reset(data.token,data.password);}
    @Get('me') async me(@Headers('authorization') token:string){return publicUser(await auth.user(token));}
    @Delete('me') async deleteMe(@Headers('authorization') token:string){return platform.deleteAccount(await auth.user(token));}
    @Patch('me/preferences') async preferences(@Headers('authorization') token:string,@Body() body:unknown){const user=await auth.user(token);const preferences=z.object({offers:z.boolean(),priceAlerts:z.boolean(),campaigns:z.boolean(),marketing:z.boolean()}).parse(body);await db.user.update({where:{id:user.id},data:{preferences}});return preferences;}
    @Post('devices') async device(@Headers('authorization') token:string,@Body() body:unknown){const user=await auth.user(token);const data=z.object({token:z.string().regex(/^(ExponentPushToken|ExpoPushToken)\[[\w-]+\]$/),platform:z.enum(['ios','android']),enabled:z.boolean().default(true)}).parse(body);return db.device.upsert({where:{token:data.token},create:{...data,userId:user.id},update:{...data,userId:user.id,lastSeenAt:new Date()}});}
    @Get('products') products(@Query('q') q:string,@Query('page') page:string){return platform.products(z.string().max(100).parse(q??''),pageSchema.parse(page));}
    @Get('products/:slug') product(@Param('slug') slug:string){return platform.product(slug);}
    @Get('intents') async intents(@Headers('authorization') token:string){return platform.intents(await auth.user(token));}
    @Post('intents') @bodyDoc(intentSchema)
    async intent(@Headers('authorization') token:string,@Headers('idempotency-key') key:string,@Body() body:unknown){const user=await auth.user(token);return platform.createIntent(user,intentSchema.parse(body),key);}
    @Delete('intents/:id') async cancelIntent(@Headers('authorization') token:string,@Param('id') id:string){return platform.cancelIntent(await auth.user(token),id);}
    @Post('offers') @bodyDoc(offerSchema)
    async offer(@Headers('authorization') token:string,@Body() body:unknown){const user=await auth.user(token);auth.roles(user,['ADMIN','MERCHANT']);return platform.publishOffer(user,offerSchema.parse(body));}
    @Delete('offers/:id') async disableOffer(@Headers('authorization') token:string,@Param('id') id:string){return platform.disableOffer(await auth.user(token),id);}
    @Get('offers/:id') async getOffer(@Param('id') id:string){const offer=await db.offer.findFirst({where:{id,active:true,startsAt:{lte:new Date()},endsAt:{gt:new Date()},merchant:{approved:true}},include:{variant:{include:{product:true}},merchant:true}});if(!offer)throw new HttpException('Oferta indisponível',404);return {...offer,priceCents:Number(offer.price.mul(100).toFixed(0))};}
    @Post('offers/:id/click') @HttpCode(200) async click(@Headers('authorization') token:string,@Param('id') id:string){return platform.click(await auth.user(token),id);}
    @Get('notifications') async notifications(@Headers('authorization') token:string){const user=await auth.user(token);return {items:await db.notification.findMany({where:{userId:user.id},take:100,orderBy:{createdAt:'desc'}})};}
    @Patch('notifications/:id') async readNotification(@Headers('authorization') token:string,@Param('id') id:string){const user=await auth.user(token);await db.notification.updateMany({where:{id,userId:user.id},data:{readAt:new Date()}});return {ok:true};}
    @Post('share/:slug') async share(@Headers('authorization') token:string,@Param('slug') slug:string){const user=await auth.user(token);const product=await platform.product(slug);await db.analyticsEvent.create({data:{userId:user.id,name:'share',properties:{productId:product.id}}});return {url:`${settings.webUrl}/p/${product.slug}?ref=${user.referralCode}`,text:`${product.variants.reduce((a,v)=>a+v.demand,0)} pessoas querem ${product.name}. Entre no JUNTA para buscar uma oferta melhor.`};}
    @Post('referrals/visit') async referral(@Body() body:unknown){const data=z.object({code:z.string().max(80),productSlug:z.string().max(150).optional()}).parse(body);await db.referralVisit.create({data});return {ok:true};}
    @Post('analytics') async analytics(@Headers('authorization') token:string,@Body() body:unknown){const user=await auth.user(token);const input=z.object({name:z.enum(['product.view','offer.view','onboarding.complete']),properties:z.record(z.string().max(40),z.union([z.string().max(200),z.number(),z.boolean()])).default({})}).parse(body);await db.analyticsEvent.create({data:{userId:user.id,...input}});return {ok:true};}
    @Get('config') async remoteConfig(){return Object.fromEntries((await db.remoteConfig.findMany()).map(x=>[x.key,x.value]));}
    @Get('admin/overview') async overview(@Headers('authorization') token:string){const user=await auth.user(token);auth.roles(user,['ADMIN','ANALYST']);return platform.overview(user);}
    @Get('merchant/overview') async merchantOverview(@Headers('authorization') token:string){const user=await auth.user(token);auth.roles(user,['MERCHANT']);return platform.overview(user);}
    @Post('admin/products') @bodyDoc(productSchema) async createProduct(@Headers('authorization') token:string,@Body() body:unknown){const user=await auth.user(token);auth.roles(user,['ADMIN']);return platform.createProduct(user,productSchema.parse(body));}
    @Patch('admin/products/:id') @bodyDoc(productSchema) async updateProduct(@Headers('authorization') token:string,@Param('id') id:string,@Body() body:unknown){const user=await auth.user(token);auth.roles(user,['ADMIN']);return platform.createProduct(user,productSchema.parse(body),id);}
    @Post('admin/campaigns') @bodyDoc(campaignSchema) async createCampaign(@Headers('authorization') token:string,@Body() body:unknown){const user=await auth.user(token);auth.roles(user,['ADMIN']);return platform.campaign(user,campaignSchema.parse(body));}
    @Patch('admin/config/:key') async setConfig(@Headers('authorization') token:string,@Param('key') key:string,@Body() body:unknown){const user=await auth.user(token);auth.roles(user,['ADMIN']);z.enum(['maintenance','dropsEnabled','minimumAppVersion']).parse(key);const value=z.object({value:z.union([z.boolean(),z.string().max(100)])}).parse(body).value;return db.remoteConfig.upsert({where:{key},create:{key,value},update:{value}});}
  }
  @Module({controllers:[Routes],providers:[{provide:'LIFECYCLE',useValue:{async onApplicationShutdown(){await redis.quit();await db.$disconnect();}}}]}) class AppModule{}
  const app=await NestFactory.create(AppModule,{logger:options.logging===false?false:['error','warn']});
  app.use((req:Request,res:Response,next:NextFunction)=>{
    const supplied=req.headers['x-request-id'];const requestId=typeof supplied==='string' && /^[\w-]{1,80}$/.test(supplied)?supplied:randomUUID();res.setHeader('X-Request-ID',requestId);
    const start=performance.now();res.on('finish',()=>{if(options.logging!==false)console.log(JSON.stringify({timestamp:new Date().toISOString(),level:'info',service:'junta-api',requestId,route:req.route?.path??req.path,method:req.method,statusCode:res.statusCode,duration:Math.round(performance.now()-start)}));});
    if(req.headers.origin && !settings.origins.includes(req.headers.origin)){res.status(403).json({statusCode:403,message:'Origem não permitida',requestId});return;}
    next();
  });
  app.use(helmet());app.use(cookieParser());
  app.enableCors({origin:settings.origins,credentials:true,allowedHeaders:['Content-Type','Authorization','Idempotency-Key','X-Request-ID']});
  app.use(async(req:Request,res:Response,next:NextFunction)=>{
    if(!/^\/(auth|products|referrals|analytics)/.test(req.path)){next();return;}
    try{
      const bucket=req.path.startsWith('/auth')?'auth':req.path.split('/')[1];const key=`junta:rate:${bucket}:${req.ip}`;
      const count=await redis.eval("local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],60) end; return n",1,key) as number;
      const limit=bucket==='auth'?(process.env.NODE_ENV==='test'?200:30):120;
      if(count>limit){res.setHeader('Retry-After','60');res.status(429).json({statusCode:429,message:'Muitas tentativas; tente em um minuto',requestId:res.getHeader('X-Request-ID')});return;}
      next();
    }catch{res.status(503).json({statusCode:503,message:'Serviço temporariamente indisponível',requestId:res.getHeader('X-Request-ID')});}
  });
  app.useGlobalFilters(new Errors());
  const document=SwaggerModule.createDocument(app,new DocumentBuilder().setTitle('JUNTA API').setDescription('Valores monetários de entrada em centavos inteiros; dados demo explicitamente identificados.').setVersion('0.1.0').addBearerAuth().build());
  if(!settings.production || process.env.ENABLE_API_DOCS==='true')SwaggerModule.setup('api/docs',app,document);
  app.enableShutdownHooks();
  return app;
}
