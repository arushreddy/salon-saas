import { useEffect } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { DataStoreProvider } from '@/context/DataStore';
import AppRouter from '@/routes/AppRouter';
import { startKeepAlive } from '@/utils/keepAlive';

function App() {
  useEffect(() => {
    startKeepAlive();
  }, []);

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