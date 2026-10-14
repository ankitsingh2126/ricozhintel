import AppRoutes from './routes/AppRoutes.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import ToastContainer from './components/common/ToastContainer.jsx';

export default function App() {
  return (
    <ToastProvider>
      <AppRoutes />
      <ToastContainer />
    </ToastProvider>
  );
}
