import { useAuth } from "./AuthContext";
import { MonitorPlay, ArrowRight } from "lucide-react";
import { Navigate } from "react-router";

export default function App() {
  const { user, signIn } = useAuth();

  if (user) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg">
            <MonitorPlay className="h-10 w-10 text-white" />
          </div>
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
          QuizPlatform
        </h1>
        <p className="text-lg text-gray-600 mb-8 max-w-sm mx-auto">
          Crie quizzes interativos elegantes e gamificados para eventos, feiras e ações de engajamento.
        </p>
        
        <button
          onClick={signIn}
          className="w-full sm:w-auto mx-auto flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-800 font-medium py-3 px-6 rounded-lg hover:bg-gray-50 focus:ring-4 focus:ring-gray-100 transition-all shadow-sm"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5 mr-1" alt="Google logo" />
          Entrar com Google
        </button>

        <div className="mt-12 text-sm text-gray-500">
          Simples. Personalizável. Profissional.
        </div>
      </div>
    </div>
  );
}
