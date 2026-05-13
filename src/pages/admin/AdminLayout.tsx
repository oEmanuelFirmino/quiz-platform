import { Outlet, Navigate, Link } from "react-router";
import { useAuth } from "../../AuthContext";
import { MonitorPlay, LayoutDashboard, LogOut } from "lucide-react";

export default function AdminLayout() {
  const { user, loading, logOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/admin" className="flex items-center gap-2">
              <MonitorPlay className="h-6 w-6 text-indigo-600" />
              <span className="font-semibold text-gray-900 text-lg">QuizPanel</span>
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-sm border py-1 px-3 rounded-full text-gray-600 bg-gray-50">{user.email}</span>
              <button 
                onClick={logOut}
                className="text-gray-500 hover:text-gray-700 p-2 rounded-md hover:bg-gray-100 transition-colors"
                title="Sair"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
