import Link from 'next/link';
export default function Page() {
  return (
    <div className="container page narrow prose">
      <h1>Termos de uso</h1>
      <p>Documento preliminar para revisão jurídica antes do lançamento público.</p>
      <p>
        O JUNTA reúne intenções de compra e mostra ofertas de lojas parceiras. Participar é grátis e
        não cria obrigação de compra. O JUNTA não vende, recebe pagamentos ou garante descontos
        neste beta.
      </p>
      <p>
        A compra, entrega, garantia e devolução são realizadas pelo parceiro. Preços de referência
        identificados como demo são fictícios. As ofertas possuem validade e podem ficar
        indisponíveis na loja. Links podem gerar comissão de afiliado.
      </p>
      <p>
        Identificação jurídica do operador, contato e foro: pendentes de informação real da empresa.
        Não use estes termos como documento jurídico final.
      </p>
      <Link className="button" href="/settings">
        Abrir configurações
      </Link>
    </div>
  );
}
