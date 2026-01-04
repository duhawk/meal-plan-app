import AppRouter from './routes';
import { UserProvider } from './contexts/UserContext';

export default function App() {
  return (
    <UserProvider>
      <AppRouter />
    </UserProvider>
  );
}


