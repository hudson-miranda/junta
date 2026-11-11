import Link from 'next/link';
export default function Page() {
  return (
    <div className="container page narrow prose">
      <h1>Excluir sua conta</h1>
      <p>Você pode excluir sua conta diretamente no aplicativo ou no site.</p>
      <p>
        Entre na sua conta, abra Configurações e escolha Excluir minha conta. Confirme para encerrar
        suas participações, revogar sessões e remover seus dados de identificação.
      </p>
      <p>
        Histórico de demanda sem identificação pode permanecer para integridade estatística. Você
        não precisa enviar email ou justificar o pedido.
      </p>
      <Link className="button" href="/settings">
        Abrir configurações
      </Link>
    </div>
  );
}
