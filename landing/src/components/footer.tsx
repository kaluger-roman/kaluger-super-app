type FooterProps = {
  firstName: string;
  lastName: string;
  patronymic: string;
};

export const Footer = ({ firstName, lastName, patronymic }: FooterProps) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-text text-text-inverse py-8 px-4">
      <div className="text-center">
        <p>
          &copy; {currentYear} {lastName} {firstName} {patronymic}
        </p>
        <p className="text-sm mt-1 opacity-70">Все права защищены</p>
      </div>
    </footer>
  );
};
