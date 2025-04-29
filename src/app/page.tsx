'use client';

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

// Initialize Firebase with detailed logging
console.log('Initializing Firebase with config:', {
  ...firebaseConfig,
  apiKey: '***' // Hide sensitive data
});

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const database = getDatabase(app);

// Test database connection
const testRef = ref(database, '.info/connected');
onValue(testRef, (snapshot) => {
  console.log('Firebase connection state:', snapshot.val());
});

// Generar un ID único para cada usuario
const generateUserId = () => {
  return 'user_' + Math.random().toString(36).substr(2, 9);
};

// Tiempo máximo para considerar a un usuario como activo (en ms)
const ACTIVE_TIMEOUT = 10000; // 10 segundos

export default function App() {
  const editorInstanceRef = useRef<any>(null);
  const [userId] = useState(generateUserId());
  const [connectedUsers, setConnectedUsers] = useState<any[]>([]);
  const projectId = 'visual-editor-project-001';
  const [isConnected, setIsConnected] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const userRefKey = useRef<string | null>(null);
  const usersListenerRef = useRef<(() => void) | null>(null);
  const lastActiveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    // Listener para cuando se selecciona un componente
    editor.on('component:selected', async (component: any) => {
      const componentId = component.getId();
      const lockRef = ref(database, `projects/${projectId}/locks/${componentId}`);
      const lockSnapshot = await get(lockRef);
      const lockData = lockSnapshot.val();

      if (lockData && lockData.userId && lockData.userId !== userId) {
        // Otro usuario lo está editando
        component.set('locked', true);
        component.addClass('being-edited');
      } else {
        // Tú puedes editar (o no hay lock)
        await set(lockRef, {
          userId,
          timestamp: serverTimestamp()
        });
        component.set('locked', false);
        component.removeClass('being-edited');
        onDisconnect(lockRef).remove();
      }
    });
    
    // Listener para cuando se deselecciona un componente
    editor.on('component:deselected', async (component: any) => {
      const componentId = component.getId();
      const lockRef = ref(database, `projects/${projectId}/locks/${componentId}`);
      const lockSnapshot = await get(lockRef);
      const lockData = lockSnapshot.val();

      // Solo elimina el lock si es tuyo
      if (lockData && lockData.userId === userId) {
        await set(lockRef, null);
      }
    });
  };

  // Configuración de autosave mejorado
  const setupAutosave = (editor: any) => {
    editor.on('component:update', () => {
      // Cancelar el timeout anterior si existe
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Mostrar indicador de guardado
      setIsSaving(true);
      
      // Programar nuevo autosave
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const projectData = editor.getProjectData();
          const projectRef = ref(database, `projects/${projectId}/data`);
          await set(projectRef, {
            ...projectData,
            lastSaved: serverTimestamp()
          });
          console.log('Project autosaved successfully');
          
          // Ocultar indicador de guardado
          setIsSaving(false);
        } catch (error) {
          console.error('Error during autosave:', error);
          setIsSaving(false);
        }
      }, 5000); // 5 segundos de debounce
    });
  };

  useEffect(() => {
    console.log('App mounted, setting up Firebase listeners');
    const database = getDatabase();
    
    // Connection status listener
    const connectedRef = ref(database, '.info/connected');
    const connectedListener = onValue(connectedRef, (snap) => {
      const connected = snap.val() === true;
      console.log('Firebase connection status:', connected);
      setIsConnected(connected);
      
      // Si se reconecta, manejar la reconexión
      if (connected) {
        handleReconnection();
      }
    });

    return () => {
      console.log('App unmounting, cleaning up...');
      connectedListener();
      if (usersListenerRef.current) {
        usersListenerRef.current();
      }
      if (userRefKey.current) {
        const userRef = ref(database, `projects/${projectId}/users/${userRefKey.current}`);
        set(userRef, null).then(() => {
          console.log('User cleanup successful');
        }).catch(error => {
          console.error('User cleanup failed:', error);
        });
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
    console.log('Editor initialized, setting up user registration');
    editorInstanceRef.current = editor;
    
    // Configurar bloqueo de componentes
    setupComponentLocking(editor);
    
    // Configurar autosave mejorado
    setupAutosave(editor);
    
    try {
      const database = getDatabase();
      const userRef = ref(database, `projects/${projectId}/users/${userId}`);
      userRefKey.current = userId; // Ahora la clave es el userId único y persistente
      
      const userInfo = {
        id: userId,
        name: `User ${userId.slice(-4)}`,
        color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
        lastActive: serverTimestamp()
      };

      console.log('Registering user:', { ...userInfo, ref: userId });

      onDisconnect(userRef).remove().then(() => {
        console.log('Disconnect handler set up successfully');
        return set(userRef, userInfo);
      }).then(() => {
        console.log('User registered successfully');
        
        // Set up users listener
        if (usersListenerRef.current) {
          usersListenerRef.current();
        }
        
        // Actualizar lastActive periódicamente
        if (lastActiveIntervalRef.current) {
          clearInterval(lastActiveIntervalRef.current);
        }
        lastActiveIntervalRef.current = setInterval(() => {
          set(ref(database, `projects/${projectId}/users/${userRefKey.current}/lastActive`), serverTimestamp());
        }, 5000);
        
        // Listener de usuarios activos
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
      }).catch(error => {
        console.error('Error in user registration:', error);
      });

    } catch (error) {
      console.error('Error in handleEditorInit:', error);
    }
  };

  // Función para manejar cambios en el archivo
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
              console.error('Error al cargar el proyecto:', err);
              alert('Error al cargar el proyecto: ' + (err instanceof Error ? err.message : 'Error desconocido'));
            }
          }
        } catch (err) {
          console.error('Error al procesar el archivo:', err);
          alert('Error en el formato del archivo: ' + (err instanceof Error ? err.message : 'El archivo no es un proyecto válido de GrapesJS'));
        }
      };
      reader.readAsText(file);
    }
  };

  // Función para exportar a Angular
  const exportToAngular = async () => {
    if (!editorInstanceRef.current) return;
    const html = await editorInstanceRef.current.getHtml();
    const css = await editorInstanceRef.current.getCss();

    const zip = new JSZip();

    // Configuración actualizada de Angular basada en el proyecto de referencia
    zip.file('angular.json', `{
  "$schema": "./node_modules/@angular/cli/lib/config/schema.json",
  "version": 1,
  "newProjectRoot": "projects",
  "projects": {
    "angular-project": {
      "projectType": "application",
      "schematics": {
        "@schematics/angular:component": {
          "style": "css"
        }
      },
      "root": "",
      "sourceRoot": "src",
      "prefix": "app",
      "architect": {
        "build": {
          "builder": "@angular-devkit/build-angular:browser",
          "options": {
            "outputPath": "dist/angular-project",
            "index": "src/index.html",
            "main": "src/main.ts",
            "polyfills": ["zone.js"],
            "tsConfig": "tsconfig.app.json",
            "assets": [
              "src/favicon.ico",
              "src/assets"
            ],
            "styles": [
              "src/styles.css"
            ],
            "scripts": []
          },
          "configurations": {
            "production": {
              "budgets": [
                {
                  "type": "initial",
                  "maximumWarning": "500kb",
                  "maximumError": "1mb"
                },
                {
                  "type": "anyComponentStyle",
                  "maximumWarning": "2kb",
                  "maximumError": "4kb"
                }
              ],
              "outputHashing": "all"
            },
            "development": {
              "buildOptimizer": false,
              "optimization": false,
              "vendorChunk": true,
              "extractLicenses": false,
              "sourceMap": true,
              "namedChunks": true
            }
          },
          "defaultConfiguration": "production"
        },
        "serve": {
          "builder": "@angular-devkit/build-angular:dev-server",
          "configurations": {
            "production": {
              "browserTarget": "angular-project:build:production"
            },
            "development": {
              "browserTarget": "angular-project:build:development"
            }
          },
          "defaultConfiguration": "development"
        }
      }
    }
  }
}`);

    zip.file('package.json', `{
  "name": "angular-project",
  "version": "0.0.0",
  "scripts": {
    "ng": "ng",
    "start": "ng serve",
    "build": "ng build"
  },
  "private": true,
  "dependencies": {
    "@angular/animations": "^16.2.0",
    "@angular/common": "^16.2.0",
    "@angular/compiler": "^16.2.0",
    "@angular/core": "^16.2.0",
    "@angular/forms": "^16.2.0",
    "@angular/platform-browser": "^16.2.0",
    "@angular/platform-browser-dynamic": "^16.2.0",
    "@angular/router": "^16.2.0",
    "rxjs": "~7.8.0",
    "tslib": "^2.3.0",
    "zone.js": "~0.13.0"
  },
  "devDependencies": {
    "@angular-devkit/build-angular": "^16.2.7",
    "@angular/cli": "^16.2.7",
    "@angular/compiler-cli": "^16.2.0",
    "typescript": "~5.1.3"
  }
}`);

    zip.file('tsconfig.json', `{
  "compileOnSave": false,
  "compilerOptions": {
    "baseUrl": "./",
    "outDir": "./dist/out-tsc",
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "sourceMap": true,
    "declaration": false,
    "downlevelIteration": true,
    "experimentalDecorators": true,
    "moduleResolution": "node",
    "importHelpers": true,
    "target": "ES2022",
    "module": "ES2022",
    "useDefineForClassFields": false,
    "lib": [
      "ES2022",
      "dom"
    ]
  },
  "angularCompilerOptions": {
    "enableI18nLegacyMessageIdFormat": false,
    "strictInjectionParameters": true,
    "strictInputAccessModifiers": true,
    "strictTemplates": true
  }
}`);

    zip.file('tsconfig.app.json', `{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./out-tsc/app",
    "types": []
  },
  "files": [
    "src/main.ts"
  ],
  "include": [
    "src/**/*.d.ts"
  ]
}`);

    // Estructura básica de la aplicación
    zip.file('src/index.html', `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Angular Project</title>
  <base href="/">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/x-icon" href="favicon.ico">
</head>
<body>
  <app-root></app-root>
</body>
</html>`);

    zip.file('src/styles.css', css);
    zip.file('src/app/app.component.html', html);
    zip.file('src/app/app.component.css', css);
    
    zip.file('src/app/app.component.ts', `import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'angular-project';
}`);

    zip.file('src/app/app.module.ts', `import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }`);

    zip.file('src/main.ts', `import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));`);

    // Descarga el ZIP
    zip.generateAsync({ type: 'blob' }).then((content) => {
      saveAs(content, 'angular-project.zip');
    });
  };

  // Listener en tiempo real para el proyecto
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
    <div style={{ height: '100vh', width: '100vw', overflow: 'hidden', margin: 0, padding: 0 }}>
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
            autosaveChanges: 100,
            autosaveIntervalMs: 10000
          },
          plugins: [
            rteTinyMce.init({}),
            canvasFullSize.init({}),
            layoutSidebarButtons.init({})
          ]
        }}
      />
    </div>
  );
}
