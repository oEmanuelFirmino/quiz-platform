import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { doc, getDoc, collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../firebase";
import { motion, AnimatePresence } from "motion/react";
import { Check } from "lucide-react";

export default function QuizPublic() {
  const { id } = useParams();
  const [quiz, setQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1); // -1 = start screen, questions.length = end screen
  const [responses, setResponses] = useState<Record<string, { id: string, points: number }>>({});
  const [submitting, setSubmitting] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (!id) return;
    const fetchQuiz = async () => {
      try {
        const quizDoc = await getDoc(doc(db, "quizzes", id));
        if (quizDoc.exists()) {
          setQuiz({ id: quizDoc.id, ...quizDoc.data() });
          const qSnapshot = await getDocs(collection(db, "quizzes", id, "questions"));
          const qs = qSnapshot.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => a.order - b.order);
          setQuestions(qs);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [id]);

  const handleStart = () => setCurrentQuestionIndex(0);

  const handleSelectOption = (questionId: string, option: any) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: { id: option.id, points: option.points }
    }));
  };

  const handleNext = async () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // finish quiz
      setSubmitting(true);
      let finalScore = 0;
      const parsedResponses: Record<string, string> = {};
      Object.keys(responses).forEach(qId => {
        finalScore += responses[qId].points;
        parsedResponses[qId] = responses[qId].id;
      });
      setScore(finalScore);

      try {
        await addDoc(collection(db, "quizzes", id!, "submissions"), {
          quizId: id,
          ownerId: quiz.ownerId,
          totalScore: finalScore,
          responses: parsedResponses,
          submittedAt: serverTimestamp()
        });
      } catch (error) {
        console.error("Error submitting", error);
      }
      
      setCurrentQuestionIndex(prev => prev + 1);
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;
  }

  if (!quiz || quiz.status !== 'published') {
    return <div className="min-h-screen flex items-center justify-center p-4 text-center">
      <div className="bg-white p-8 rounded-2xl shadow-sm max-w-md w-full">
        <h2 className="text-xl font-medium text-gray-900">Quiz indisponível</h2>
        <p className="text-gray-500 mt-2">Este quiz não existe ou não está publicado.</p>
      </div>
    </div>;
  }

  const themeVars = {
    '--c-bg': quiz.theme?.bgColor || '#f9fafb',
    '--c-primary': quiz.theme?.primaryColor || '#4f46e5',
    '--c-text': quiz.theme?.textColor || '#111827',
    '--c-btn': quiz.theme?.buttonColor || '#4f46e5',
  } as React.CSSProperties;

  return (
    <div className="min-h-screen flex flex-col font-sans transition-colors duration-500" style={{ ...themeVars, backgroundColor: 'var(--c-bg)', color: 'var(--c-text)' }}>
      <div className="flex-1 w-full max-w-3xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col relative pt-12 sm:pt-20">
        
        {quiz.theme?.logoUrl && (
          <div className="absolute top-6 left-6 right-6 flex justify-center sm:justify-start">
            <img src={quiz.theme.logoUrl} alt="Logo" className="h-10 object-contain" />
          </div>
        )}

        <div className="flex-1 flex flex-col justify-center max-w-2xl w-full mx-auto">
          <AnimatePresence mode="wait">
            {currentQuestionIndex === -1 && (
              <motion.div
                key="start"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20, filter: "blur(4px)" }}
                className="text-center sm:text-left"
              >
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
                  {quiz.title}
                </h1>
                {quiz.description && (
                  <p className="text-lg sm:text-xl opacity-80 mb-10 max-w-xl">
                    {quiz.description}
                  </p>
                )}
                <button
                  onClick={handleStart}
                  className="px-8 py-4 rounded-full text-white font-medium text-lg transition-transform hover:scale-105 hover:opacity-90 shadow-lg"
                  style={{ backgroundColor: 'var(--c-btn)' }}
                >
                  Começar agora
                </button>
              </motion.div>
            )}

            {currentQuestionIndex >= 0 && currentQuestionIndex < questions.length && (
              <motion.div
                key={`q-${currentQuestionIndex}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20, filter: "blur(4px)" }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                <div className="text-sm font-medium opacity-50 mb-4 tracking-wider uppercase">
                  Pergunta {currentQuestionIndex + 1} de {questions.length}
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold mb-8 leading-snug">
                  {questions[currentQuestionIndex].text}
                </h2>
                
                <div className="space-y-3">
                  {questions[currentQuestionIndex].options.map((opt: any) => {
                    const isSelected = responses[questions[currentQuestionIndex].id]?.id === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleSelectOption(questions[currentQuestionIndex].id, opt)}
                        className={`w-full text-left p-5 rounded-xl border-2 transition-all flex items-center justify-between group ${
                          isSelected 
                            ? 'border-transparent ring-2 shadow-md' 
                            : 'border-black/10 hover:border-black/20 hover:bg-black/5'
                        }`}
                        style={{ 
                          backgroundColor: isSelected ? 'var(--c-primary)' : 'transparent',
                          color: isSelected ? '#ffffff' : 'inherit',
                          minHeight: '4.5rem'
                        }}
                      >
                        <span className="font-medium pr-4">{opt.text}</span>
                        {isSelected && <Check className="w-5 h-5 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-10 flex justify-end">
                  <button
                    onClick={handleNext}
                    disabled={submitting || !responses[questions[currentQuestionIndex].id]}
                    className="px-8 py-4 rounded-full text-white font-medium text-lg transition-transform disabled:opacity-50 disabled:hover:scale-100 hover:scale-105 shadow-md flex items-center gap-2"
                    style={{ backgroundColor: 'var(--c-btn)' }}
                  >
                    {submitting ? "Enviando..." : (currentQuestionIndex === questions.length - 1 ? "Finalizar Quiz" : "Próxima")}
                  </button>
                </div>
              </motion.div>
            )}

            {currentQuestionIndex === questions.length && (
              <motion.div
                key="end"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center bg-white p-10 sm:p-14 rounded-3xl shadow-xl flex flex-col items-center max-w-lg mx-auto"
                style={{ color: '#111827' }} // Forcing text color since it's a solid white card
              >
                <div className="mb-4">
                  <span className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6" style={{ backgroundColor: 'var(--c-primary)', color: 'white' }}>
                    <Check className="w-10 h-10" />
                  </span>
                </div>
                <h2 className="text-3xl font-bold mb-4">Quiz concluído!</h2>
                
                <div className="text-6xl font-black mb-6 tracking-tighter" style={{ color: 'var(--c-primary)' }}>
                  {score} <span className="text-2xl font-semibold opacity-50 tracking-normal text-gray-400">pts</span>
                </div>

                {quiz.scoreMessages && Array.isArray(quiz.scoreMessages) && (() => {
                  const msg = quiz.scoreMessages.find((m: any) => score >= m.minScore && score <= m.maxScore);
                  if (msg) return <p className="text-lg text-gray-600">{msg.message}</p>;
                  return null;
                })()}

                <button
                  onClick={() => window.location.reload()}
                  className="mt-10 px-6 py-3 rounded-xl border border-gray-200 font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Refazer quiz
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
