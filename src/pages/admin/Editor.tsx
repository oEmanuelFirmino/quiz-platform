import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { db, handleFirestoreError, OperationType } from "../../firebase";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  query,
  where,
} from "firebase/firestore";
import { useAuth } from "../../AuthContext";
import {
  Save,
  Plus,
  Trash2,
  ArrowLeft,
  Settings2,
  Eye,
  BarChart3,
  Download,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { downloadCSV } from "../../utils/export";

export type QuestionType = "choice" | "scale";

export interface ScaleConfig {
  min: number;
  max: number;
  minLabel: string;
  maxLabel: string;
}

export interface Option {
  id: string;
  text: string;
  points: number;
}

export interface Question {
  qid?: string;
  quizId: string;
  ownerId: string;
  text: string;
  order: number;
  type: QuestionType;
  options: Option[];
  scaleConfig?: ScaleConfig;
  createdAt?: any;
  updatedAt?: any;
}

const AVAILABLE_LEAD_FIELDS = [
  { id: "nome", label: "Nome Completo" },
  { id: "email", label: "E-mail" },
  { id: "telefone", label: "Telefone / WhatsApp" },
  { id: "idade", label: "Idade" },
  { id: "sexo", label: "Sexo" },
];

export default function Editor() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"editor" | "settings" | "results">(
    "editor",
  );
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  useEffect(() => {
    if (!id || !user) return;
    const loadCode = async () => {
      try {
        const qDoc = await getDoc(doc(db, "quizzes", id));
        if (qDoc.exists()) {
          const data = qDoc.data();
          if (data.ownerId !== user.uid) {
            navigate("/admin");
            return;
          }
          setQuiz({ id: qDoc.id, ...data });

          const qSnapshot = await getDocs(
            collection(db, "quizzes", id, "questions"),
          );
          const qs = qSnapshot.docs
            .map((d) => ({ qid: d.id, ...d.data() }))
            .sort((a: any, b: any) => a.order - b.order);
          setQuestions(qs);
        } else {
          navigate("/admin");
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadCode();
  }, [id, user, navigate]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, "quizzes", id!), {
        title: quiz.title,
        description: quiz.description || "",
        status: quiz.status,
        theme: quiz.theme || {},
        scoreMessages: quiz.scoreMessages || [],
        leadCapture: quiz.leadCapture || { enabled: false, fields: [] },
        updatedAt: serverTimestamp(),
      });

      const batch = writeBatch(db);

      const qSnapshot = await getDocs(
        collection(db, "quizzes", id!, "questions"),
      );
      const existingIds = qSnapshot.docs.map((d) => d.id);

      const currentIds = questions.filter((q) => q.qid).map((q) => q.qid);
      const toDelete = existingIds.filter((eid) => !currentIds.includes(eid));

      toDelete.forEach((d_id) => {
        batch.delete(doc(db, "quizzes", id!, "questions", d_id));
      });

      questions.forEach((q, index) => {
        const payload: any = {
          text: q.text,
          order: index,
          type: q.type || "choice",
          options: q.type === "scale" ? [] : q.options,
          updatedAt: serverTimestamp(),
        };

        if (q.type === "scale" && q.scaleConfig) {
          payload.scaleConfig = {
            min: Number(q.scaleConfig.min),
            max: Number(q.scaleConfig.max),
            minLabel: q.scaleConfig.minLabel,
            maxLabel: q.scaleConfig.maxLabel,
          };
        }

        if (q.qid) {
          batch.update(doc(db, "quizzes", id!, "questions", q.qid), payload);
        } else {
          const newRef = doc(collection(db, "quizzes", id!, "questions"));
          batch.set(newRef, {
            quizId: id,
            ownerId: user!.uid,
            createdAt: serverTimestamp(),
            ...payload,
          });
        }
      });

      await batch.commit();

      const newQSnapshot = await getDocs(
        collection(db, "quizzes", id!, "questions"),
      );
      const qs = newQSnapshot.docs
        .map((d) => ({ qid: d.id, ...d.data() }))
        .sort((a: any, b: any) => a.order - b.order);
      setQuestions(qs);

      alert("Quiz salvo com sucesso!");
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar o quiz");
    } finally {
      setSaving(false);
    }
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        text: "",
        type: "choice",
        options: [
          { id: Math.random().toString(36).substr(2, 9), text: "", points: 0 },
          { id: Math.random().toString(36).substr(2, 9), text: "", points: 0 },
        ],
      },
    ]);
  };

  const changeQuestionType = (qIndex: number, newType: QuestionType) => {
    const q = [...questions];
    q[qIndex].type = newType;
    if (newType === "scale" && !q[qIndex].scaleConfig) {
      q[qIndex].scaleConfig = {
        min: 1,
        max: 5,
        minLabel: "Discordo",
        maxLabel: "Concordo",
      };
    }
    setQuestions(q);
  };

  const updateScaleConfig = (
    qIndex: number,
    field: keyof ScaleConfig,
    value: string | number,
  ) => {
    const q = [...questions];
    if (q[qIndex].scaleConfig) {
      q[qIndex].scaleConfig = { ...q[qIndex].scaleConfig, [field]: value };
    }
    setQuestions(q);
  };

  const updateQuestionText = (index: number, text: string) => {
    const q = [...questions];
    q[index].text = text;
    setQuestions(q);
  };

  const updateOptionText = (qIndex: number, oIndex: number, text: string) => {
    const q = [...questions];
    q[qIndex].options[oIndex].text = text;
    setQuestions(q);
  };

  const updateOptionPoints = (
    qIndex: number,
    oIndex: number,
    points: number,
  ) => {
    const q = [...questions];
    q[qIndex].options[oIndex].points = points;
    setQuestions(q);
  };

  const addOption = (qIndex: number) => {
    const q = [...questions];
    q[qIndex].options.push({
      id: Math.random().toString(36).substr(2, 9),
      text: "",
      points: 0,
    });
    setQuestions(q);
  };

  const removeOption = (qIndex: number, oIndex: number) => {
    const q = [...questions];
    q[qIndex].options.splice(oIndex, 1);
    setQuestions(q);
  };

  const loadSubmissions = async () => {
    setLoadingSubmissions(true);
    try {
      const q = query(
        collection(db, "quizzes", id!, "submissions"),
        where("ownerId", "==", user!.uid),
      );
      const subSnapshot = await getDocs(q);
      setSubmissions(subSnapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error("Erro no fetch de resultados:", e);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  useEffect(() => {
    if (activeTab === "results") {
      loadSubmissions();
    }
  }, [activeTab, id]);

  const removeQuestion = (qIndex: number) => {
    const q = [...questions];
    q.splice(qIndex, 1);
    setQuestions(q);
  };

  const moveQuestionUp = (qIndex: number) => {
    if (qIndex === 0) return;
    const q = [...questions];
    const temp = q[qIndex - 1];
    q[qIndex - 1] = q[qIndex];
    q[qIndex] = temp;
    setQuestions(q);
  };

  const moveQuestionDown = (qIndex: number) => {
    if (qIndex === questions.length - 1) return;
    const q = [...questions];
    const temp = q[qIndex + 1];
    q[qIndex + 1] = q[qIndex];
    q[qIndex] = temp;
    setQuestions(q);
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/admin")}
            className="p-2 -ml-2 rounded-lg text-gray-500 hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={quiz.title}
            onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
            className="text-2xl font-bold bg-transparent border-none focus:outline-none focus:ring-0 text-gray-900 placeholder-gray-400 p-0"
            placeholder="Título do Quiz"
          />
        </div>
        <div className="flex items-center gap-3">
          <select
            value={quiz.status}
            onChange={(e) => setQuiz({ ...quiz, status: e.target.value })}
            className="border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm py-2 px-3 bg-white"
          >
            <option value="draft">Rascunho</option>
            <option value="published">Publicado</option>
          </select>
          <button
            onClick={() => window.open(`/q/${id}`, "_blank")}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <Eye className="w-4 h-4" /> Prévia
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Salvar
          </button>
        </div>
      </div>

      <div className="flex gap-8 items-start relative max-w-5xl mx-auto w-full">
        <div className="w-64 sticky top-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden text-sm">
            <button
              onClick={() => setActiveTab("editor")}
              className={`w-full flex items-center gap-3 px-4 py-3 border-l-2 transition-colors ${activeTab === "editor" ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-medium" : "border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}
            >
              <div className="w-4 h-4 font-bold">1</div> Perguntas
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full flex items-center gap-3 px-4 py-3 border-l-2 transition-colors border-t border-gray-100 ${activeTab === "settings" ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-medium" : "border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}
            >
              <Settings2 className="w-4 h-4" /> Configurações Visuais
            </button>
            <button
              onClick={() => setActiveTab("results")}
              className={`w-full flex items-center gap-3 px-4 py-3 border-l-2 transition-colors border-t border-gray-100 ${activeTab === "results" ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-medium" : "border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}
            >
              <BarChart3 className="w-4 h-4" /> Resultados & Métricas
            </button>
          </div>
        </div>

        <div className="flex-1 pb-24">
          {activeTab === "editor" && (
            <div className="space-y-6">
              {questions.map((q, qIndex) => (
                <div
                  key={qIndex}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col gap-2 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 font-medium text-sm">
                          #{qIndex + 1}
                        </span>
                        <input
                          type="text"
                          value={q.text}
                          onChange={(e) =>
                            updateQuestionText(qIndex, e.target.value)
                          }
                          placeholder="Digite a pergunta..."
                          className="font-medium text-lg text-gray-900 w-full bg-transparent border-0 border-b-2 border-transparent focus:border-indigo-500 focus:ring-0 px-0 pb-1"
                        />
                      </div>
                      <div className="pl-6 mt-1">
                        <select
                          value={q.type || "choice"}
                          onChange={(e) =>
                            changeQuestionType(
                              qIndex,
                              e.target.value as QuestionType,
                            )
                          }
                          className="text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 py-1.5 px-3"
                        >
                          <option value="choice">Múltipla Escolha</option>
                          <option value="scale">Escala Linear (Likert)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => moveQuestionUp(qIndex)}
                        disabled={qIndex === 0}
                        className="text-gray-400 hover:text-indigo-600 p-2 disabled:opacity-30 disabled:hover:text-gray-400"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveQuestionDown(qIndex)}
                        disabled={qIndex === questions.length - 1}
                        className="text-gray-400 hover:text-indigo-600 p-2 disabled:opacity-30 disabled:hover:text-gray-400"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeQuestion(qIndex)}
                        className="text-gray-400 hover:text-red-500 p-2 ml-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="pl-6 space-y-3 mt-4">
                    {(!q.type || q.type === "choice") && (
                      <>
                        {q.options.map((opt: any, oIndex: number) => (
                          <div key={opt.id} className="flex gap-3 items-center">
                            <div className="w-4 h-4 rounded-full border-2 border-gray-300"></div>
                            <input
                              type="text"
                              value={opt.text}
                              onChange={(e) =>
                                updateOptionText(qIndex, oIndex, e.target.value)
                              }
                              placeholder={`Opção ${oIndex + 1}`}
                              className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:bg-white focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={opt.points}
                                onChange={(e) =>
                                  updateOptionPoints(
                                    qIndex,
                                    oIndex,
                                    parseInt(e.target.value) || 0,
                                  )
                                }
                                className="w-20 bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 text-sm text-center focus:bg-white focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Pts"
                              />
                              <span className="text-xs text-gray-500 font-medium">
                                pts
                              </span>
                            </div>
                            {q.options.length > 2 && (
                              <button
                                onClick={() => removeOption(qIndex, oIndex)}
                                className="text-gray-400 hover:text-red-500 p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          onClick={() => addOption(qIndex)}
                          className="text-sm font-medium text-indigo-600 mt-2 hover:text-indigo-800 flex items-center gap-1.5 ml-7"
                        >
                          <Plus className="w-3.5 h-3.5" /> Adicionar opção
                        </button>
                      </>
                    )}

                    {q.type === "scale" && q.scaleConfig && (
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">
                          Configuração da Escala
                        </h4>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">
                              Valor Mínimo
                            </label>
                            <input
                              type="number"
                              value={q.scaleConfig.min}
                              onChange={(e) =>
                                updateScaleConfig(
                                  qIndex,
                                  "min",
                                  parseInt(e.target.value) || 0,
                                )
                              }
                              className="w-full border-gray-300 rounded-md text-sm p-2 border"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">
                              Valor Máximo
                            </label>
                            <input
                              type="number"
                              value={q.scaleConfig.max}
                              onChange={(e) =>
                                updateScaleConfig(
                                  qIndex,
                                  "max",
                                  parseInt(e.target.value) || 0,
                                )
                              }
                              className="w-full border-gray-300 rounded-md text-sm p-2 border"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">
                              Label Mínima
                            </label>
                            <input
                              type="text"
                              value={q.scaleConfig.minLabel}
                              onChange={(e) =>
                                updateScaleConfig(
                                  qIndex,
                                  "minLabel",
                                  e.target.value,
                                )
                              }
                              className="w-full border-gray-300 rounded-md text-sm p-2 border"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">
                              Label Máxima
                            </label>
                            <input
                              type="text"
                              value={q.scaleConfig.maxLabel}
                              onChange={(e) =>
                                updateScaleConfig(
                                  qIndex,
                                  "maxLabel",
                                  e.target.value,
                                )
                              }
                              className="w-full border-gray-300 rounded-md text-sm p-2 border"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <button
                onClick={addQuestion}
                className="w-full py-12 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-white transition-all group"
              >
                <div className="bg-gray-100 p-3 rounded-full group-hover:bg-indigo-50 mb-3 transition-colors">
                  <Plus className="w-6 h-6" />
                </div>
                <span className="font-medium text-lg">
                  Adicionar nova pergunta
                </span>
              </button>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
              <div className="pb-6 border-b border-gray-100">
                <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                  Formulário de Captura (Leads)
                </h4>
                <p className="text-sm text-gray-500 mb-4">
                  Exija dados dos usuários antes de iniciarem o quiz.
                </p>

                <label className="flex items-center gap-3 mb-6 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={quiz.leadCapture?.enabled || false}
                    onChange={(e) =>
                      setQuiz({
                        ...quiz,
                        leadCapture: {
                          ...(quiz.leadCapture || {}),
                          enabled: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-800">
                    Habilitar tela de captura
                  </span>
                </label>

                {quiz.leadCapture?.enabled && (
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      Campos obrigatórios
                    </span>
                    <div className="flex flex-wrap gap-4">
                      {AVAILABLE_LEAD_FIELDS.map((field) => {
                        const isChecked =
                          quiz.leadCapture?.fields?.includes(field.id) || false;
                        return (
                          <label
                            key={field.id}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${isChecked ? "bg-indigo-50 border-indigo-200" : "bg-white border-gray-200 hover:bg-gray-50"}`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const currentFields =
                                  quiz.leadCapture?.fields || [];
                                const newFields = e.target.checked
                                  ? [...currentFields, field.id]
                                  : currentFields.filter(
                                      (f: string) => f !== field.id,
                                    );
                                setQuiz({
                                  ...quiz,
                                  leadCapture: {
                                    ...quiz.leadCapture,
                                    fields: newFields,
                                  },
                                });
                              }}
                              className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                            />
                            <span className="text-sm font-medium text-gray-700">
                              {field.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição / Instruções
                  <span className="text-gray-400 font-normal text-xs ml-1">
                    (Aparece na tela inicial)
                  </span>
                </label>
                <textarea
                  value={quiz.description || ""}
                  onChange={(e) =>
                    setQuiz({ ...quiz, description: e.target.value })
                  }
                  rows={3}
                  className="w-full border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border"
                  placeholder="Bem-vindo ao nosso quiz..."
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-6 pt-6 border-t border-gray-100">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL da Logo
                  </label>
                  <input
                    type="text"
                    value={quiz.theme?.logoUrl || ""}
                    onChange={(e) =>
                      setQuiz({
                        ...quiz,
                        theme: { ...quiz.theme, logoUrl: e.target.value },
                      })
                    }
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cor Primária (Card selecionado)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={quiz.theme?.primaryColor || "#4f46e5"}
                      onChange={(e) =>
                        setQuiz({
                          ...quiz,
                          theme: {
                            ...quiz.theme,
                            primaryColor: e.target.value,
                          },
                        })
                      }
                      className="h-9 w-12 rounded border border-gray-200 p-0.5"
                    />
                    <input
                      type="text"
                      value={quiz.theme?.primaryColor || "#4f46e5"}
                      onChange={(e) =>
                        setQuiz({
                          ...quiz,
                          theme: {
                            ...quiz.theme,
                            primaryColor: e.target.value,
                          },
                        })
                      }
                      className="flex-1 border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border uppercase font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cor do Botão Principal
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={quiz.theme?.buttonColor || "#4f46e5"}
                      onChange={(e) =>
                        setQuiz({
                          ...quiz,
                          theme: { ...quiz.theme, buttonColor: e.target.value },
                        })
                      }
                      className="h-9 w-12 rounded border border-gray-200 p-0.5"
                    />
                    <input
                      type="text"
                      value={quiz.theme?.buttonColor || "#4f46e5"}
                      onChange={(e) =>
                        setQuiz({
                          ...quiz,
                          theme: { ...quiz.theme, buttonColor: e.target.value },
                        })
                      }
                      className="flex-1 border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border uppercase font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cor de Fundo (Página)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={quiz.theme?.bgColor || "#f9fafb"}
                      onChange={(e) =>
                        setQuiz({
                          ...quiz,
                          theme: { ...quiz.theme, bgColor: e.target.value },
                        })
                      }
                      className="h-9 w-12 rounded border border-gray-200 p-0.5"
                    />
                    <input
                      type="text"
                      value={quiz.theme?.bgColor || "#f9fafb"}
                      onChange={(e) =>
                        setQuiz({
                          ...quiz,
                          theme: { ...quiz.theme, bgColor: e.target.value },
                        })
                      }
                      className="flex-1 border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border uppercase font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className="w-16 h-16 rounded-xl flex items-center justify-center border shadow-sm"
                    style={{
                      backgroundColor: quiz.theme?.bgColor || "#f9fafb",
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded shrink-0"
                      style={{
                        backgroundColor: quiz.theme?.buttonColor || "#4f46e5",
                      }}
                    ></div>
                  </div>
                  <div>
                    <span className="block text-sm font-medium bg-gray-50 px-2 py-0.5 rounded text-gray-600 uppercase tracking-wide">
                      Preview de cores
                    </span>
                    <span className="block text-xs text-gray-500 mt-1">
                      Como vai ficar no quiz
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100">
                <h4 className="text-sm font-medium text-gray-700 mb-4">
                  Mensagens Personalizadas de Resultado
                </h4>
                <div className="space-y-3">
                  {(quiz.scoreMessages || []).map((msg: any, i: number) => (
                    <div
                      key={i}
                      className="flex gap-3 items-end flex-wrap sm:flex-nowrap"
                    >
                      <div className="w-20">
                        <label className="block text-xs text-gray-500 mb-1">
                          Mín (pts)
                        </label>
                        <input
                          type="number"
                          value={msg.minScore}
                          onChange={(e) => {
                            const newMsgs = [...(quiz.scoreMessages || [])];
                            newMsgs[i].minScore = parseInt(e.target.value) || 0;
                            setQuiz({ ...quiz, scoreMessages: newMsgs });
                          }}
                          className="w-full border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border text-center"
                        />
                      </div>
                      <div className="w-20">
                        <label className="block text-xs text-gray-500 mb-1">
                          Máx (pts)
                        </label>
                        <input
                          type="number"
                          value={msg.maxScore}
                          onChange={(e) => {
                            const newMsgs = [...(quiz.scoreMessages || [])];
                            newMsgs[i].maxScore = parseInt(e.target.value) || 0;
                            setQuiz({ ...quiz, scoreMessages: newMsgs });
                          }}
                          className="w-full border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border text-center"
                        />
                      </div>

                      <div className="w-28">
                        <label className="block text-xs text-gray-500 mb-1">
                          Alvo (Sexo)
                        </label>
                        <select
                          value={msg.genderFilter || "all"}
                          onChange={(e) => {
                            const newMsgs = [...(quiz.scoreMessages || [])];
                            newMsgs[i].genderFilter = e.target.value;
                            setQuiz({ ...quiz, scoreMessages: newMsgs });
                          }}
                          className="w-full border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border bg-white"
                        >
                          <option value="all">Todos</option>
                          <option value="Masculino">Masculino</option>
                          <option value="Feminino">Feminino</option>
                        </select>
                      </div>

                      <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs text-gray-500 mb-1">
                          Mensagem a ser exibida
                        </label>
                        <input
                          type="text"
                          value={msg.message}
                          onChange={(e) => {
                            const newMsgs = [...(quiz.scoreMessages || [])];
                            newMsgs[i].message = e.target.value;
                            setQuiz({ ...quiz, scoreMessages: newMsgs });
                          }}
                          className="w-full border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newMsgs = [...(quiz.scoreMessages || [])];
                          newMsgs.splice(i, 1);
                          setQuiz({ ...quiz, scoreMessages: newMsgs });
                        }}
                        className="p-2 mb-0.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const newMsgs = [
                        ...(quiz.scoreMessages || []),
                        {
                          minScore: 0,
                          maxScore: 10,
                          message: "",
                          genderFilter: "all",
                        },
                      ];
                      setQuiz({ ...quiz, scoreMessages: newMsgs });
                    }}
                    className="text-sm font-medium text-indigo-600 mt-2 hover:text-indigo-800 flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar regra de mensagem
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "results" && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
              <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Métricas do Quiz
                </h3>
                {submissions.length > 0 && (
                  <button
                    onClick={() =>
                      downloadCSV(submissions, `Respostas - ${quiz.title}`)
                    }
                    className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <Download className="w-4 h-4" /> Exportar CSV
                  </button>
                )}
              </div>
              {loadingSubmissions ? (
                <div className="text-gray-500 text-center py-6">
                  Carregando resultados...
                </div>
              ) : submissions.length === 0 ? (
                <div className="text-gray-500 text-center py-6">
                  Ainda não há respostas para este quiz.
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                        Total de Respostas
                      </div>
                      <div className="text-3xl font-bold text-gray-900">
                        {submissions.length}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                        Média de Pontos
                      </div>
                      <div className="text-3xl font-bold text-gray-900">
                        {Math.round(
                          (submissions.reduce(
                            (acc, curr) => acc + curr.totalScore,
                            0,
                          ) /
                            submissions.length) *
                            100,
                        ) / 100}
                      </div>
                    </div>
                  </div>
                  <div className="mt-8 border rounded-xl overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Data
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Contato
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Pontuação
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {submissions
                          .slice()
                          .reverse()
                          .map((sub) => (
                            <tr key={sub.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {sub.submittedAt && sub.submittedAt.toDate
                                  ? sub.submittedAt.toDate().toLocaleString()
                                  : "-"}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {sub.leadData?.nome || sub.leadData?.email ? (
                                  <div>
                                    <div className="font-medium text-gray-900">
                                      {sub.leadData.nome || "-"}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {sub.leadData.email || ""}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="italic opacity-50">
                                    Anônimo
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {sub.totalScore}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
