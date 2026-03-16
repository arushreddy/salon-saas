import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { DataStoreProvider } from '@/context/DataStore';
import AppRouter from '@/routes/AppRouter';

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <DataStoreProvider>
          <AppRouter />
        </DataStoreProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;