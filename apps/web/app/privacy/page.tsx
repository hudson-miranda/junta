import Link from 'next/link';
export default function Page() {
  return (
    <div className="container page narrow prose">
      <h1>Privacidade</h1>
      <p>Documento preliminar para revisão jurídica antes do lançamento público.</p>
      <p>
        O JUNTA usa nome, email, sessões, intenções de compra, preferências de aviso e eventos de
        uso para operar a demanda coletiva e apresentar ofertas. As lojas visualizam demanda
        agregada, sem os dados pessoais dos participantes.
      </p>
      <p>
        Tokens de sessão são protegidos; avisos push dependem de sua permissão. Não coletamos dados
        de pagamento neste beta. Ao clicar em uma oferta, você acessa o site de um parceiro, sujeito
        à política dele.
      </p>
      <p>
        Você pode alterar preferências e excluir sua conta nas configurações. Registros agregados e
        históricos sem identificação podem ser preservados. Operador, contato do encarregado, bases
        legais, prazos de retenção e fornecedores: pendentes de definição pela empresa. Este
        documento não é uma política jurídica final.
      </p>
      <Link className="button" href="/settings">
        Abrir configurações
      </Link>
    </div>
  );
}
