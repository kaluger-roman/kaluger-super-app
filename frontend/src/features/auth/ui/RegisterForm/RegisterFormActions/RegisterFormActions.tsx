import { useNavigate } from "react-router-dom";

import * as Styled from "./RegisterFormActions.styled";

type RegisterFormActionsProps = {
  validationError: string;
  authError: string | null;
  isLoading: boolean;
  isMobile: boolean;
  onSubmit: () => void;
};

export const RegisterFormActions = ({
  validationError,
  authError,
  isLoading,
  isMobile,
  onSubmit,
}: RegisterFormActionsProps) => {
  const navigate = useNavigate();

  return (
    <>
      {(validationError || authError) && (
        <Styled.StyledAlert severity="error">{validationError || authError}</Styled.StyledAlert>
      )}

      <Styled.SubmitButton
        fullWidth
        variant="contained"
        size={isMobile ? "medium" : "large"}
        $isMobile={isMobile}
        disabled={isLoading}
        onClick={onSubmit}
      >
        {isLoading ? "Регистрация..." : "Зарегистрироваться"}
      </Styled.SubmitButton>

      <Styled.LinkButton
        fullWidth
        variant="text"
        size={isMobile ? "medium" : "large"}
        $isMobile={isMobile}
        onClick={() => navigate("/login")}
      >
        Уже есть аккаунт? Войти
      </Styled.LinkButton>
    </>
  );
};
