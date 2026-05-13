import { useEffect, useState } from "react";
import { useAuth } from "../../AuthContext";
import { db, handleFirestoreError, OperationType } from "../../firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp, deleteDoc, doc } from "firebase/firestore";
import { Link, useNavigate } from "react-router";
import { Plus, Trash2, Edit2, Play, Copy } from "lucide-react";

interface Quiz {
  id: string;
  title: string;
  status: string;
  createdAt: { toMillis: () => number } | null;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchQuizzes = async () => {
      try {
        const q = query(collection(db, "quizzes"), where("ownerId", "==", user.uid));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Quiz));
        setQuizzes(data.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, "quizzes");
      } finally {
        setLoading(false);
      }
    };
    fetchQuizzes();
  }, [user]);

  const handleCreate = async () => {
    if (!user) return;
    setCreating(true);
    try {
      const newQuiz = {
        title: "Novo Quiz",
        ownerId: user.uid,
        status: "draft",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, "quizzes"), newQuiz);
      navigate(`/admin/quiz/${docRef.id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "quizzes");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Tem certeza que deseja excluir este quiz?")) return;
    try {
      await deleteDoc(doc(db, "quizzes", id));
      setQuizzes(q => q.filter(quiz => quiz.id !== id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `quizzes/${id}`);
    }
  };

  const copyLink = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/q/${id}`;
    navigator.clipboard.writeText(url);
    alert("Link copiado para a área de transferência!");
  };

  if (loading) return <div>Carregando quizzes...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meus Quizzes</h1>
          <p className="text-gray-500 text-sm mt-1">Gerencie seus eventos e campanhas</p>
        </div>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <Plus className="h-5 w-5" />
          {creating ? "Criando..." : "Novo Quiz"}
        </button>
      </div>

      {quizzes.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum quiz encontrado</h3>
          <p className="text-gray-500 mb-6">Comece criando o seu primeiro quiz interativo.</p>
          <button
            onClick={handleCreate}
            className="text-indigo-600 font-medium hover:text-indigo-700"
          >
            Criar novo quiz &rarr;
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz) => (
            <Link
              key={quiz.id}
              to={`/admin/quiz/${quiz.id}`}
              className="bg-white group rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col"
            >
              <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    quiz.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {quiz.status === 'published' ? 'Publicado' : 'Rascunho'}
                  </span>
                </div>
                <h3 className="font-semibold text-lg text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                  {quiz.title}
                </h3>
              </div>
              <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                <div className="flex gap-2">
                  <button onClick={(e) => copyLink(quiz.id, e)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-md transition-colors" title="Copiar link compartilhavel">
                    <Copy className="h-4 w-4" />
                  </button>
                  <Link to={`/q/${quiz.id}`} target="_blank" onClick={(e) => e.stopPropagation()} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors" title="Abrir link do quiz">
                    <Play className="h-4 w-4" />
                  </Link>
                </div>
                <button onClick={(e) => handleDelete(quiz.id, e)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Excluir quiz">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
