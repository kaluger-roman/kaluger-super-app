import * as Styled from "./RegisterFormHeader.styled";

type RegisterFormHeaderProps = {
  isMobile: boolean;
};

export const RegisterFormHeader = ({ isMobile }: RegisterFormHeaderProps) => {
  return (
    <Styled.Container $isMobile={isMobile}>
      <Styled.EmojiTitle
        variant={isMobile ? "h4" : "h3"}
        component="h1"
        gutterBottom
        $isMobile={isMobile}
      >
        🎓
      </Styled.EmojiTitle>
      <Styled.Title
        variant={isMobile ? "h5" : "h4"}
        component="h2"
        gutterBottom
        $isMobile={isMobile}
      >
        Создать аккаунт
      </Styled.Title>
      <Styled.Subtitle
        variant={isMobile ? "body2" : "body1"}
        color="text.secondary"
        $isMobile={isMobile}
      >
        Зарегистрируйтесь в Kaluger Tutor
      </Styled.Subtitle>
    </Styled.Container>
  );
};
