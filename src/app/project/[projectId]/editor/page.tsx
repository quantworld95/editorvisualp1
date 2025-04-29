"use client";
import Sidebar from "@/components/Sidebar";
import { useRef, useEffect, useState } from 'react';
import StudioEditor from '@grapesjs/studio-sdk/react';
import { rteTinyMce, canvasFullSize, layoutSidebarButtons } from '@grapesjs/studio-sdk-plugins';
import '@grapesjs/studio-sdk/style';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { 
  getDatabase, 
  ref, 
  onValue, 
  set, 
  push,
  onDisconnect,
  serverTimestamp,
  get,
  connectDatabaseEmulator 
} from 'firebase/database';
import { useRouter } from "next/navigation";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDpfyYfMKfn1mo_s0qZuHcflrTFRqomXf0",
  authDomain: "editorvisual-cd8be.firebaseapp.com",
  databaseURL: "https://editorvisual-cd8be-default-rtdb.firebaseio.com",
  projectId: "editorvisual-cd8be",
  storageBucket: "editorvisual-cd8be.firebasestorage.app",
  messagingSenderId: "417907350583",
  appId: "1:417907350583:web:c0baf89877ec9f91ba33b2",
  measurementId: "G-8FYM2K8VBQ"
};

console.log('Initializing Firebase with config:', {
  ...firebaseConfig,
  apiKey: '***' // Hide sensitive data
});

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const database = getDatabase(app);

const generateUserId = () => {
  return 'user_' + Math.random().toString(36).substr(2, 9);
};

const ACTIVE_TIMEOUT = 10000; // 10 segundos

export default function ProjectEditorPage({ params }: { params: { projectId: string } }) {
  const editorInstanceRef = useRef<any>(null);
  const [userId] = useState(generateUserId());
  const [connectedUsers, setConnectedUsers] = useState<any[]>([]);
  const projectId = params.projectId;
  const [isConnected, setIsConnected] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const userRefKey = useRef<string | null>(null);
  const usersListenerRef = useRef<(() => void) | null>(null);
  const lastActiveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  // Función para manejar reconexiones
  const handleReconnection = async () => {
    if (editorInstanceRef.current) {
      try {
        // Recargar el estado del proyecto
        const projectRef = ref(database, `projects/${projectId}/data`);
        const snapshot = await get(projectRef);
        if (snapshot.exists()) {
          await editorInstanceRef.current.loadProjectData(snapshot.val());
        }
        // Reestablecer el estado del usuario
        if (userRefKey.current) {
          const userRef = ref(database, `projects/${projectId}/users/${userRefKey.current}`);
          await set(userRef, {
            id: userId,
            name: `User ${userId.slice(-4)}`,
            color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
            lastActive: serverTimestamp()
          });
        }
      } catch (error) {
        console.error('Error during reconnection:', error);
      }
    }
  };

  // Configuración de bloqueo de componentes
  const setupComponentLocking = (editor: any) => {
    editor.on('component:selected', async (component: any) => {
      const componentId = component.getId();
      const lockRef = ref(database, `projects/${projectId}/locks/${componentId}`);
      const lockSnapshot = await get(lockRef);
      const lockData = lockSnapshot.val();
      if (lockData && lockData.userId && lockData.userId !== userId) {
        component.set('locked', true);
        component.addClass('being-edited');
      } else {
        await set(lockRef, {
          userId,
          timestamp: serverTimestamp()
        });
        component.set('locked', false);
        component.removeClass('being-edited');
        onDisconnect(lockRef).remove();
      }
    });
    editor.on('component:deselected', async (component: any) => {
      const componentId = component.getId();
      const lockRef = ref(database, `projects/${projectId}/locks/${componentId}`);
      const lockSnapshot = await get(lockRef);
      const lockData = lockSnapshot.val();
      if (lockData && lockData.userId === userId) {
        await set(lockRef, null);
      }
    });
  };

  // Configuración de autosave mejorado
  const setupAutosave = (editor: any) => {
    editor.on('component:update', () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      setIsSaving(true);
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const projectData = editor.getProjectData();
          const projectRef = ref(database, `projects/${projectId}/data`);
          await set(projectRef, {
            ...projectData,
            lastSaved: serverTimestamp()
          });
          setIsSaving(false);
        } catch (error) {
          console.error('Error during autosave:', error);
          setIsSaving(false);
        }
      }, 5000);
    });
  };

  useEffect(() => {
    const database = getDatabase();
    const connectedRef = ref(database, '.info/connected');
    const connectedListener = onValue(connectedRef, (snap) => {
      const connected = snap.val() === true;
      setIsConnected(connected);
      if (connected) {
        handleReconnection();
      }
    });
    return () => {
      connectedListener();
      if (usersListenerRef.current) {
        usersListenerRef.current();
      }
      if (userRefKey.current) {
        const userRef = ref(database, `projects/${projectId}/users/${userRefKey.current}`);
        set(userRef, null);
      }
      if (lastActiveIntervalRef.current) {
        clearInterval(lastActiveIntervalRef.current);
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleEditorInit = (editor: any) => {
    editorInstanceRef.current = editor;
    setupComponentLocking(editor);
    setupAutosave(editor);
    try {
      const database = getDatabase();
      const userRef = ref(database, `projects/${projectId}/users/${userId}`);
      userRefKey.current = userId;
      const userInfo = {
        id: userId,
        name: `User ${userId.slice(-4)}`,
        color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
        lastActive: serverTimestamp()
      };
      onDisconnect(userRef).remove().then(() => {
        return set(userRef, userInfo);
      }).then(() => {
        if (usersListenerRef.current) {
          usersListenerRef.current();
        }
        if (lastActiveIntervalRef.current) {
          clearInterval(lastActiveIntervalRef.current);
        }
        lastActiveIntervalRef.current = setInterval(() => {
          set(ref(database, `projects/${projectId}/users/${userRefKey.current}/lastActive`), serverTimestamp());
        }, 5000);
        const usersRef = ref(database, `projects/${projectId}/users`);
        const unsubscribe = onValue(usersRef, (snapshot) => {
          const users = snapshot.val();
          const now = Date.now();
          let activeUsers: any[] = [];
          if (users) {
            activeUsers = Object.values(users).filter((user: any) => {
              if (!user || !user.lastActive) return false;
              const lastActive = typeof user.lastActive === 'object' && user.lastActive.seconds
                ? user.lastActive.seconds * 1000
                : user.lastActive;
              return now - lastActive < ACTIVE_TIMEOUT;
            });
          }
          setConnectedUsers(activeUsers);
        });
        usersListenerRef.current = unsubscribe;
      });
    } catch (error) {
      console.error('Error in handleEditorInit:', error);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.grapesjs')) {
        alert('Por favor selecciona un archivo con extensión .grapesjs');
        return;
      }
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const projectData = JSON.parse(e.target?.result as string);
          if (!projectData || typeof projectData !== 'object') {
            throw new Error('Formato de proyecto inválido');
          }
          if (!projectData.pages && !projectData.components) {
            throw new Error('El proyecto debe contener al menos components o pages');
          }
          if (editorInstanceRef.current) {
            try {
              await editorInstanceRef.current.Pages.remove();
              await editorInstanceRef.current.loadProjectData(projectData);
              const components = editorInstanceRef.current.Components.getComponents();
              if (components.length > 0 || projectData.pages?.length > 0) {
                alert(`Proyecto "${file.name}" cargado correctamente`);
              } else {
                throw new Error('El proyecto se cargó pero no contiene componentes');
              }
            } catch (err) {
              alert('Error al cargar el proyecto: ' + (err instanceof Error ? err.message : 'Error desconocido'));
            }
          }
        } catch (err) {
          alert('Error en el formato del archivo: ' + (err instanceof Error ? err.message : 'El archivo no es un proyecto válido de GrapesJS'));
        }
      };
      reader.readAsText(file);
    }
  };

  const exportToAngular = async () => {
    if (!editorInstanceRef.current) return;
    const html = await editorInstanceRef.current.getHtml();
    const css = await editorInstanceRef.current.getCss();
    const zip = new JSZip();
    // ... (resto del código de exportación)
  };

  useEffect(() => {
    if (!editorInstanceRef.current) return;
    const projectRef = ref(database, `projects/${projectId}/data`);
    const unsubscribe = onValue(projectRef, async (snapshot) => {
      const data = snapshot.val();
      if (data && editorInstanceRef.current) {
        await editorInstanceRef.current.loadProjectData(data);
      }
    });
    return () => {
      unsubscribe();
    };
  }, [editorInstanceRef.current]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 relative" style={{ height: '100vh', overflow: 'hidden', margin: 0, padding: 0 }}>
        {/* Botón Home fijo */}
        <button
          onClick={() => router.push('/dashboard')}
          style={{
            position: 'fixed',
            top: 24,
            left: 100, // Ajusta según el ancho de tu sidebar
            zIndex: 9999,
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '50%',
            width: 44,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
            cursor: 'pointer',
          }}
          title="Go to dashboard"
        >
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M3 12L12 3l9 9" />
            <path d="M9 21V9h6v12" />
          </svg>
        </button>
        {/* Connection status indicator */}
        <div style={{
          position: 'absolute',
          top: 8,
          left: 16,
          zIndex: 1000,
          background: isConnected ? '#4CAF50' : '#f44336',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px'
        }}>
          {isConnected ? 'Connected to Firebase' : 'Disconnected from Firebase'}
        </div>
        {/* Autosave indicator */}
        <div className={`autosave-indicator ${isSaving ? 'saving' : 'saved'}`}>
          {isSaving ? 'Guardando cambios...' : 'Cambios guardados'}
        </div>
        {/* Panel de usuarios conectados */}
        <div style={{
          position: 'absolute',
          top: 8,
          right: 16,
          zIndex: 1000,
          background: 'white',
          padding: '8px',
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          fontSize: '13px',
          fontFamily: 'system-ui'
        }}>
          <div style={{ marginBottom: '4px', fontWeight: 'bold' }}>
            Usuarios Conectados: {connectedUsers.length}
          </div>
          {connectedUsers.map((user: any) => (
            <div key={user.id} style={{ 
              padding: '2px 4px',
              borderRadius: '2px',
              background: '#f0f0f0',
              marginBottom: '2px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: user.color
              }}></span>
              {user.name}
            </div>
          ))}
        </div>
        <div style={{ 
          position: 'absolute', 
          zIndex: 1,
          top: 8,
          left: '35%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '8px',
          padding: '8px',
          background: 'transparent'
        }}>
          <label
            style={{
              background: '#4e7bff',
              color: '#ffffff',
              padding: '8px 16px',
              borderRadius: 4,
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '13px',
              border: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              textTransform: 'uppercase',
              minHeight: '32px',
              lineHeight: '1',
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Ubuntu, "Helvetica Neue", sans-serif'
            }}
          >
            UPLOAD PROJECT
            <input
              type="file"
              accept=".grapesjs"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </label>
          <button
            onClick={exportToAngular}
            style={{
              background: '#38a169',
              color: '#ffffff',
              padding: '8px 16px',
              borderRadius: 4,
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '13px',
              border: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              textTransform: 'uppercase',
              minHeight: '32px',
              lineHeight: '1',
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Ubuntu, "Helvetica Neue", sans-serif'
            }}
          >
            EXPORTAR A ANGULAR
          </button>
        </div>
        <StudioEditor
          onEditor={handleEditorInit}
          options={{
            licenseKey: 'b8e25bfaf4034846a55d33439cbf5b67c8b70d227e584215bfdaabfbe51b3d39',
            project: {
              type: 'web',
              id: projectId
            },
            identity: {
              id: userId
            },
            assets: {
              storageType: 'cloud'
            },
            storage: {
              type: 'cloud',
              // ... (resto de las opciones de configuración)
            }
          }}
        />
      </div>
    </div>
  );
} 