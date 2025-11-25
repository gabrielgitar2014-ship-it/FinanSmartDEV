// src/pages/CreateAccountPage.jsx

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AddAccountModal from "../components/AddAccountModal";

/**
 * Página dedicada à criação de uma nova conta.
 *
 * Importante:
 * - NÃO usa useAccountDetails
 * - NÃO faz nenhuma chamada ao Supabase aqui
 * - Só abre o AddAccountModal já visível
 *
 * Fluxo:
 * - Usuário acessa /accounts/new
 * - Modal de nova conta abre imediatamente
 * - Ao salvar ou cancelar, redireciona para /accounts
 */
export default function CreateAccountPage() {
  const navigate = useNavigate();

  const handleClose = () => {
    // Depois de criar/cancelar, volta para a lista de contas
    navigate("/accounts");
  };

  useEffect(() => {
    // Se você quiser no futuro adicionar qualquer side-effect
    // ao entrar na tela de criação de conta, faça aqui.
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-28 lg:pb-0">
      {/* 
        A página fica “limpa”, o foco é o modal.
        O AddAccountModal é quem contém todo o formulário
        e a lógica de criar a conta no Supabase.
      */}
      <AddAccountModal
        isOpen={true}     // Modal sempre aberto nesta página
        onClose={handleClose}
      />
    </div>
  );
}
