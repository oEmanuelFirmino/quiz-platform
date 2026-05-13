import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Configuração explícita do seu projeto no Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyBNCLn0E84js0QHVWas2mJwjrBLp0m_7hc",
  authDomain: "teste-fdd94.firebaseapp.com",
  projectId: "teste-fdd94",
  storageBucket: "teste-fdd94.firebasestorage.app",
  messagingSenderId: "682078835964",
  appId: "1:682078835964:web:e179e591456aa867b0f379",
  measurementId: "G-CG3DB91D3C"
};

// Inicialização dos módulos centrais
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app); // Simplificado: assume o banco de dados '(default)'
export const auth = getAuth(app);

// Tipagens e utilitários de erro mantidos
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}