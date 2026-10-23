import { useState, useCallback, useRef, useEffect, createContext, useContext } from 'react';
import ReactFlow, {
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  ReactFlowProvider,
  Handle,
  Position,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiX, FiSave, FiPlay, FiPlus, FiTrash2, FiChevronLeft,
  FiRotateCcw, FiRepeat, FiCopy, FiLayers, FiGrid,
} from 'react-icons/fi';
import { flowService, extensionService, crewService, intentService } from '../../services';
import { useToast } from '../../context/ToastContext';
import { useLoading } from '../../context/LoadingContext';
import { useModules } from '../../context/ModulesContext';

const NODE_TYPES_CONFIG = {
  saludo:            { label: 'Saludo',        color: '#3b82f6', icon: '👋', defaultConfig: { message: '¡Hola! ¿En qué puedo ayudarle?' } },
  intent_classifier: { label: 'Clasificar',    color: '#8b5cf6', icon: '🎯', defaultConfig: {} },
  rag_query:         { label: 'Consultar KB',  color: '#10b981', icon: '📚', defaultConfig: { top_k: 3 } },
  llm_reply:         { label: 'Respuesta LLM', color: '#f59e0b', icon: '🤖', defaultConfig: { temperature: 0.4 } },
  action_tool:       { label: 'Acción',        color: '#ef4444', icon: '⚡', defaultConfig: { tool: '', params: {} }, module: 'citas' },
  extract_data:      { label: 'Capturar dato', color: '#0ea5e9', icon: '🧩', defaultConfig: { variable: '', description: '', data_type: 'texto', question: '' } },
  condition:         { label: 'Condición',     color: '#ec4899', icon: '🔀', defaultConfig: { expression: '' } },
  transfer:          { label: 'Transferir',    color: '#f97316', icon: '📞', defaultConfig: { mode: 'queue', destination: '', context: 'from-internal', message: 'Un momento, le transfiero con un agente.' } },
  despedida:         { label: 'Despedida',     color: '#64748b', icon: '👋', defaultConfig: { message: 'Gracias por llamar. ¡Que tenga un buen día!' } },
  set_variable:      { label: 'Set Variable',  color: '#14b8a6', icon: '📝', defaultConfig: { key: '', value: '' } },
  crew_agent:        { label: 'Agente con herramientas', color: '#7c3aed', icon: '🧠', defaultConfig: { crew_id: '', instructions: '', output: 'reply', result_var: 'crew_resultado' } },
  webhook:           { label: 'Webhook',       color: '#6366f1', icon: '🔗', defaultConfig: { url: '', method: 'POST', headers: '', body: '', result_var: 'webhook', message: '', message_error: '' } },
};

// Variables every call has, usable as {{nombre}} in texts and webhooks.
const BUILTIN_VARIABLES = [
  { name: 'transcript_text', desc: 'Lo que acaba de decir quien llama' },
  { name: 'caller_number', desc: 'Número de quien llama' },
  { name: 'dialed_number', desc: 'Número o extensión marcada' },
  { name: 'call_id', desc: 'Id de la llamada' },
];

const EXTRACT_TYPES = [
  { value: 'texto', label: 'Texto' },
  { value: 'nombre', label: 'Nombre de persona' },
  { value: 'numero', label: 'Número' },
  { value: 'fecha', label: 'Fecha' },
  { value: 'hora', label: 'Hora' },
  { value: 'si_no', label: 'Sí / No' },
  { value: 'email', label: 'Correo electrónico' },
  { value: 'telefono', label: 'Teléfono' },
];

// flowVariables lists the call variables the flow's nodes define.
function flowVariables(nodes) {
  const out = [];
  nodes.forEach((n) => {
    const c = n.data?.config || {};
    if (n.data?.tipo === 'extract_data' && c.variable) out.push({ name: c.variable, desc: `Capturado: ${c.description || c.variable}` });
    if (n.data?.tipo === 'set_variable' && c.key) out.push({ name: c.key, desc: 'Set Variable' });
    if (n.data?.tipo === 'crew_agent' && c.output === 'variable' && c.result_var) out.push({ name: c.result_var, desc: 'Respuesta del equipo de agentes' });
    if (n.data?.tipo === 'webhook' && c.result_var) out.push({ name: `${c.result_var}.data`, desc: 'Respuesta del webhook (usa .campo)' });
  });
  return out;
}

// Intents the classifier node can route on (edge condition "intent == x").
const INTENT_OPTIONS = [
  { value: 'saludo', label: 'Saludo' },
  { value: 'agendar_cita', label: 'Agendar cita', module: 'citas' },
  { value: 'cancelar_cita', label: 'Cancelar cita', module: 'citas' },
  { value: 'reprogramar_cita', label: 'Reprogramar cita', module: 'citas' },
  { value: 'confirmar_cita', label: 'Confirmar cita', module: 'citas' },
  { value: 'consultar_cita', label: 'Consultar cita', module: 'citas' },
  { value: 'consulta_general', label: 'Consulta general' },
  { value: 'despedida', label: 'Despedida' },
  { value: 'fuera_de_alcance', label: 'Fuera de alcance' },
];

// withEdgeIds gives stored/template edges the id React Flow needs.
const withEdgeIds = (edges) => edges.map((e, i) => ({
  ...defaultEdgeOptions,
  ...e,
  id: e.id || `e-${e.source}-${e.target}-${i}`,
}));

const FLOW_TEMPLATES = [
  {
    name: 'Atención al Cliente',
    desc: 'Flujo básico inbound: saludo → clasificar → consultar KB → responder → despedida',
    nodes: [
      { id: 'start', type: 'intent_classifier', config: {}, data: { label: '' }, position: { x: 300, y: 20 } },
      { id: 'saludo', type: 'saludo', config: { message: '¡Hola! ¿En qué puedo ayudarle?' }, data: { label: 'Saludo inicial' }, position: { x: 300, y: 140 } },
      { id: 'kb', type: 'rag_query', config: { top_k: 3 }, data: { label: 'Consultar KB' }, position: { x: 300, y: 260 } },
      { id: 'llm', type: 'llm_reply', config: { temperature: 0.4 }, data: { label: 'Respuesta' }, position: { x: 300, y: 380 } },
      { id: 'despedida', type: 'despedida', config: { message: 'Gracias por llamar. ¡Que tenga un buen día!' }, data: { label: 'Despedida' }, position: { x: 300, y: 500 } },
    ],
    edges: [
      { source: 'start', target: 'saludo', condition: 'intent == saludo', label: '' },
      { source: 'saludo', target: 'kb', condition: '', label: '' },
      { source: 'kb', target: 'llm', condition: '', label: '' },
      { source: 'llm', target: 'despedida', condition: '', label: '' },
    ],
  },
  {
    name: 'Agendamiento de Citas',
    module: 'citas',
    desc: 'Clasificar → saludo → agendar / cancelar / reprogramar cita con IA, consultar KB, pasar a un agente o despedirse',
    nodes: [
      { id: 'start', type: 'intent_classifier', config: {}, data: { label: 'Clasificar intención' }, position: { x: 340, y: 0 } },
      { id: 'saludo', type: 'saludo', config: { message: 'Bienvenido, le atiende el asistente virtual. ¿Desea agendar o cancelar una cita?' }, data: { label: 'Saludo' }, position: { x: 340, y: 120 } },
      { id: 'agendar', type: 'action_tool', config: { tool: 'create_event' }, data: { label: 'Agendar cita' }, position: { x: 0, y: 270 } },
      { id: 'cancelar', type: 'action_tool', config: { tool: 'cancel_event' }, data: { label: 'Cancelar cita' }, position: { x: 230, y: 270 } },
      { id: 'reprogramar', type: 'action_tool', config: { tool: 'reschedule_event' }, data: { label: 'Reprogramar cita' }, position: { x: -240, y: 270 } },
      { id: 'kb', type: 'rag_query', config: { top_k: 3 }, data: { label: 'Consultar KB' }, position: { x: 460, y: 270 } },
      { id: 'llm', type: 'llm_reply', config: { temperature: 0.3 }, data: { label: 'Responder con KB' }, position: { x: 460, y: 400 } },
      { id: 'despedida', type: 'despedida', config: { message: 'Gracias por llamar. ¡Que tenga un buen día!' }, data: { label: 'Despedida' }, position: { x: 690, y: 270 } },
      { id: 'transferir', type: 'transfer', config: { mode: 'queue', message: 'Claro, le comunico con uno de nuestros agentes. Un momento por favor.' }, data: { label: 'Hablar con un agente' }, position: { x: 920, y: 270 } },
    ],
    edges: [
      { id: 'e-start-saludo', source: 'start', target: 'saludo', condition: '', label: '' },
      { id: 'e-saludo-agendar', source: 'saludo', target: 'agendar', condition: 'intent == agendar_cita', label: 'Agendar' },
      { id: 'e-saludo-cancelar', source: 'saludo', target: 'cancelar', condition: 'intent == cancelar_cita', label: 'Cancelar' },
      { id: 'e-saludo-reprogramar', source: 'saludo', target: 'reprogramar', condition: 'intent == reprogramar_cita', label: 'Reprogramar' },
      { id: 'e-saludo-kb', source: 'saludo', target: 'kb', condition: 'intent == consulta_general', label: 'Consulta' },
      { id: 'e-saludo-despedida', source: 'saludo', target: 'despedida', condition: 'intent == despedida', label: 'Despedida' },
      { id: 'e-saludo-transferir', source: 'saludo', target: 'transferir', condition: 'intent == fuera_de_alcance', label: 'Pide un humano' },
      { id: 'e-kb-llm', source: 'kb', target: 'llm', condition: '', label: '' },
    ],
  },
  {
    name: 'Pedidos (restaurante / comida rápida)',
    desc: 'Clasificar → saludo → tomar pedido o consultar su estado con un equipo IA (tu API o base de datos), menú desde la KB, reclamos a un agente',
    nodes: [
      { id: 'start', type: 'intent_classifier', config: {}, data: { label: 'Clasificar intención' }, position: { x: 340, y: 0 } },
      { id: 'saludo', type: 'saludo', config: { message: 'Gracias por llamar. ¿Desea hacer un pedido o consultar uno que ya hizo?' }, data: { label: 'Saludo' }, position: { x: 340, y: 120 } },
      { id: 'pedido', type: 'crew_agent', config: { crew_id: '', instructions: 'Toma el pedido: productos, cantidades, dirección o sucursal y forma de pago. Confírmalo al final.', output: 'reply', result_var: 'crew_resultado' }, data: { label: 'Tomar pedido' }, position: { x: 0, y: 270 } },
      { id: 'estado', type: 'crew_agent', config: { crew_id: '', instructions: 'Busca el último pedido de {{caller_number}} y di su estado y tiempo estimado.', output: 'reply', result_var: 'crew_resultado' }, data: { label: 'Estado del pedido' }, position: { x: 230, y: 270 } },
      { id: 'kb', type: 'rag_query', config: { top_k: 3 }, data: { label: 'Menú y sucursales (KB)' }, position: { x: 460, y: 270 } },
      { id: 'llm', type: 'llm_reply', config: { temperature: 0.3 }, data: { label: 'Responder con KB' }, position: { x: 460, y: 400 } },
      { id: 'despedida', type: 'despedida', config: { message: 'Gracias por su pedido. ¡Buen provecho!' }, data: { label: 'Despedida' }, position: { x: 690, y: 270 } },
      { id: 'transferir', type: 'transfer', config: { mode: 'queue', message: 'Le comunico con un asesor. Un momento por favor.' }, data: { label: 'Hablar con un asesor' }, position: { x: 920, y: 270 } },
    ],
    edges: [
      { id: 'e-start-saludo', source: 'start', target: 'saludo', condition: '', label: '' },
      { id: 'e-saludo-pedido', source: 'saludo', target: 'pedido', condition: 'intent == hacer_pedido', label: 'Pedido' },
      { id: 'e-saludo-estado', source: 'saludo', target: 'estado', condition: 'intent == estado_pedido', label: 'Estado' },
      { id: 'e-saludo-menu', source: 'saludo', target: 'kb', condition: 'intent == consultar_menu', label: 'Menú' },
      { id: 'e-saludo-kb', source: 'saludo', target: 'kb', condition: 'intent == consulta_general', label: 'Consulta' },
      { id: 'e-saludo-despedida', source: 'saludo', target: 'despedida', condition: 'intent == despedida', label: 'Despedida' },
      { id: 'e-saludo-reclamo', source: 'saludo', target: 'transferir', condition: 'intent == reclamo', label: 'Reclamo' },
      { id: 'e-saludo-transferir', source: 'saludo', target: 'transferir', condition: 'intent == fuera_de_alcance', label: 'Pide un humano' },
      { id: 'e-kb-llm', source: 'kb', target: 'llm', condition: '', label: '' },
    ],
  },
  {
    name: 'Soporte con validación y transferencia',
    desc: 'Pide el número de cliente, lo valida en tu sistema (webhook) y responde o transfiere a un agente',
    nodes: [
      { id: 'start', type: 'intent_classifier', config: {}, data: { label: 'Clasificar intención' }, position: { x: 320, y: 0 } },
      { id: 'saludo', type: 'saludo', config: { message: 'Bienvenido a soporte. ¿En qué le puedo ayudar?' }, data: { label: 'Saludo' }, position: { x: 320, y: 110 } },
      { id: 'cliente', type: 'extract_data', config: { variable: 'numero_cliente', description: 'número de cliente', data_type: 'numero', question: 'Con gusto. ¿Me indica su número de cliente?' }, data: { label: 'Pedir número de cliente' }, position: { x: 120, y: 240 } },
      { id: 'consulta', type: 'webhook', config: { method: 'GET', url: 'https://api.miempresa.com/clientes/{{numero_cliente}}', headers: '{"Authorization": "Bearer TU_TOKEN"}', body: '', result_var: 'cliente', message: '', message_error: '' }, data: { label: 'Consultar cliente' }, position: { x: 120, y: 360 } },
      { id: 'valido', type: 'condition', config: { expression: 'cliente.ok == true' }, data: { label: '¿Cliente encontrado?' }, position: { x: 120, y: 480 } },
      { id: 'responder', type: 'llm_reply', config: { temperature: 0.3, system_prompt: 'Eres agente de soporte. Usa los datos del cliente para responder su consulta en frases cortas.' }, data: { label: 'Responder' }, position: { x: 0, y: 610 } },
      { id: 'transferir', type: 'transfer', config: { mode: 'queue', message: 'No encontré su cuenta. Le comunico con un agente.' }, data: { label: 'Transferir a agente' }, position: { x: 260, y: 610 } },
      { id: 'humano', type: 'transfer', config: { mode: 'queue', message: 'Claro, le comunico con un agente.' }, data: { label: 'Pide un humano' }, position: { x: 470, y: 240 } },
      { id: 'despedida', type: 'despedida', config: { message: 'Gracias por llamar. ¡Que tenga un buen día!' }, data: { label: 'Despedida' }, position: { x: 680, y: 240 } },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'saludo', condition: '', label: '' },
      { id: 'e2', source: 'saludo', target: 'humano', condition: 'intent == fuera_de_alcance', label: 'Humano' },
      { id: 'e3', source: 'saludo', target: 'despedida', condition: 'intent == despedida', label: 'Despedida' },
      { id: 'e4', source: 'saludo', target: 'cliente', condition: '', label: 'Consulta' },
      { id: 'e5', source: 'cliente', target: 'consulta', condition: '', label: '' },
      { id: 'e6', source: 'consulta', target: 'valido', condition: '', label: '' },
      { id: 'e7', source: 'valido', target: 'responder', condition: 'condition_result == true', label: 'Sí' },
      { id: 'e8', source: 'valido', target: 'transferir', condition: 'condition_result == false', label: 'No' },
    ],
  },
  {
    name: 'Cobro / Recordatorio',
    desc: 'Outbound: presentación → validar identidad → informar deuda → opciones de pago',
    nodes: [
      { id: 'start', type: 'saludo', config: { message: '¿Hablo con {{nombre}}? Le llamamos de {{empresa}} para recordarle...' }, data: { label: 'Presentación' }, position: { x: 300, y: 20 } },
      { id: 'cond', type: 'condition', config: { expression: 'context.confirmed == true' }, data: { label: '¿Confirmó identidad?' }, position: { x: 300, y: 140 } },
      { id: 'info', type: 'llm_reply', config: { temperature: 0.3, system_prompt: 'Informa amablemente sobre la deuda pendiente y las opciones de pago disponibles.' }, data: { label: 'Informar deuda' }, position: { x: 160, y: 260 } },
      { id: 'transfer', type: 'transfer', config: { destination: 'cobranza', message: 'Le transferiré con un agente de cobranza.' }, data: { label: 'Transferir' }, position: { x: 440, y: 260 } },
      { id: 'despedida', type: 'despedida', config: { message: 'Gracias por su atención. Que tenga un buen día.' }, data: { label: 'Despedida' }, position: { x: 160, y: 380 } },
    ],
    edges: [
      { source: 'start', target: 'cond', condition: '', label: '' },
      { source: 'cond', target: 'info', condition: 'confirmed == true', label: 'Sí' },
      { source: 'cond', target: 'transfer', condition: 'confirmed == false', label: 'No' },
      { source: 'info', target: 'despedida', condition: '', label: '' },
    ],
  },
];

const TOOL_LABELS = {
  create_event: 'Agendar cita (IA)',
  cancel_event: 'Cancelar cita (IA)',
  reschedule_event: 'Reprogramar cita (IA)',
  list_events: 'Consultar citas (IA)',
  find_or_create_contact: 'Buscar/Crear contacto',
};

// nodeDetail summarizes a node's configuration under its name.
function nodeDetail(tipo, config = {}, crews = []) {
  switch (tipo) {
    case 'saludo':
    case 'despedida':
      return config.message;
    case 'action_tool':
      return TOOL_LABELS[config.tool] || 'Sin acción seleccionada';
    case 'rag_query':
      return `Busca ${config.top_k || 3} fragmentos en la KB del agente`;
    case 'llm_reply':
      return config.system_prompt || 'Responde con el prompt del agente';
    case 'transfer':
      if ((config.mode || (config.destination ? 'extension' : 'queue')) === 'queue') return 'Agentes de la campaña (balanceo + espera)';
      return config.destination ? `Extensión ${config.destination}` : 'Sin extensión';
    case 'condition':
      return config.expression || 'Sin expresión';
    case 'set_variable':
      return config.key && `${config.key} = ${config.value}`;
    case 'crew_agent': {
      const crew = crews.find((c) => c.id === config.crew_id);
      if (!config.crew_id) return 'Sin equipo seleccionado';
      return `${crew?.nombre || 'Equipo'} → ${config.output === 'variable' ? `{{${config.result_var || 'crew_resultado'}}}` : 'responde'}`;
    }
    case 'webhook':
      return config.url ? `${config.method || 'POST'} ${config.url}` : 'Sin URL';
    case 'extract_data':
      return config.variable ? `Guarda en {{${config.variable}}}` : 'Sin variable';
    case 'intent_classifier':
      return 'Detecta la intención de quien llama';
    default:
      return '';
  }
}

// Below this width the palette and the properties panel do not both fit
// next to the canvas.
const NARROW_SCREEN_PX = 1280;

const defaultEdgeOptions = {
  type: 'smoothstep',
  labelBgPadding: [6, 3],
  labelBgBorderRadius: 4,
  labelBgStyle: { fill: 'var(--surface)', stroke: 'var(--border)' },
  labelStyle: { fontSize: 11, fontWeight: 600, fill: 'var(--text-secondary)' },
  style: { strokeWidth: 1.5 },
};

// The tenant's CrewAI teams, so "Agente CrewAI" nodes show the team name.
const CrewsContext = createContext([]);

function FlowNode({ data, selected }) {
  const crews = useContext(CrewsContext);
  const config = NODE_TYPES_CONFIG[data.tipo] || { label: data.tipo, color: '#94a3b8', icon: '❓' };
  const detail = nodeDetail(data.tipo, data.config, crews);
  return (
    <div className={`flow-node ${selected ? 'selected' : ''}`} style={{ borderColor: config.color }}>
      <Handle type="target" position={Position.Top} />
      <div className="flow-node-header" style={{ background: config.color }}>
        <span>{config.icon}</span>
        <span>{config.label}</span>
      </div>
      <div className="flow-node-body">
        <div className="flow-node-label">{data.label || config.label}</div>
        {detail && <div className="flow-node-detail" title={detail}>{detail}</div>}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

const nodeTypes = { flowNode: FlowNode };

function useUndoRedo(nodes, edges, setNodes, setEdges) {
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);
  const skipRef = useRef(false);

  const snapshot = useCallback(() => {
    return { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) };
  }, [nodes, edges]);

  const pushSnapshot = useCallback((snap) => {
    if (skipRef.current) { skipRef.current = false; return; }
    setPast(p => [...p.slice(-29), snap]);
    setFuture([]);
  }, []);

  useEffect(() => {
    if (nodes.length > 0 || edges.length > 0) {
      pushSnapshot(snapshot());
    }
  }, [nodes.length, edges.length]);

  const undo = useCallback(() => {
    if (past.length <= 1) return;
    const current = snapshot();
    setFuture(f => [current, ...f.slice(0, 29)]);
    const prev = past[past.length - 2];
    setPast(p => p.slice(0, -1));
    skipRef.current = true;
    setNodes(prev.nodes);
    setEdges(prev.edges);
  }, [past, snapshot, setNodes, setEdges]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const current = snapshot();
    setPast(p => [...p, current]);
    const next = future[0];
    setFuture(f => f.slice(1));
    skipRef.current = true;
    setNodes(next.nodes);
    setEdges(next.edges);
  }, [future, snapshot, setNodes, setEdges]);

  return { undo, redo, canUndo: past.length > 1, canRedo: future.length > 0 };
}

function FlowCanvas({ nodes, edges, onNodesChange, onEdgesChange, onConnect, onDrop, onDragOver, onNodeClick, onNodeDoubleClick, onEdgeClick, onPaneClick, setReactFlowInstance, showMiniMap }) {
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onNodeClick={onNodeClick}
      onNodeDoubleClick={onNodeDoubleClick}
      onEdgeClick={onEdgeClick}
      onPaneClick={onPaneClick}
      onInit={setReactFlowInstance}
      nodeTypes={nodeTypes}
      defaultEdgeOptions={defaultEdgeOptions}
      fitView
      fitViewOptions={{ padding: 0.15 }}
      attributionPosition="bottom-left"
    >
      <Controls />
      <Background variant="dots" gap={20} size={1} />
      {showMiniMap && <MiniMap pannable zoomable style={{ width: 140, height: 90 }} />}
    </ReactFlow>
  );
}

function FlowBuilder({ flowId, onBack }) {
  const toast = useToast();
  const { has: hasModule } = useModules();
  const allowed = (item) => !item.module || hasModule(item.module);
  const { showLoading, hideLoading } = useLoading();
  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [extensions, setExtensions] = useState([]);
  const [crews, setCrews] = useState([]);
  const [intentOptions, setIntentOptions] = useState(() => INTENT_OPTIONS.filter(allowed));

  useEffect(() => {
    extensionService.list()
      .then((res) => setExtensions((res?.items || res || []).filter((e) => (e.estado || 'activa') === 'activa')))
      .catch(() => setExtensions([]));
    crewService.list()
      .then((res) => setCrews(res?.items || []))
      .catch(() => setCrews([]));
    // The tenant's intent catalog (Equipos IA → Intenciones).
    intentService.list()
      .then((res) => {
        const items = (res?.items || []).map((i) => ({ value: i.clave, label: i.nombre, activa: i.activa }));
        if (items.length) setIntentOptions(items);
      })
      .catch(() => {});
  }, []);
  const [flowName, setFlowName] = useState('');
  const [flowDesc, setFlowDesc] = useState('');
  const [flowStatus, setFlowStatus] = useState('draft');
  const [showPalette, setShowPalette] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snapped, setSnapped] = useState(false);

  const { undo, redo, canUndo, canRedo } = useUndoRedo(nodes, edges, setNodes, setEdges);

  // Re-frame the diagram once it is loaded and whenever the side panels
  // change the canvas width (they animate in, so wait for them).
  const fitPendingRef = useRef(false);
  const refit = useCallback(() => {
    if (!reactFlowInstance) return;
    setTimeout(() => reactFlowInstance.fitView({ padding: 0.15, duration: 200 }), 50);
  }, [reactFlowInstance]);

  useEffect(() => {
    if (fitPendingRef.current && nodes.length > 0 && reactFlowInstance) {
      fitPendingRef.current = false;
      setTimeout(() => reactFlowInstance.fitView({ padding: 0.15 }), 350);
    }
  }, [nodes, reactFlowInstance]);

  useEffect(() => {
    if (flowId) loadFlow(flowId);
  }, [flowId]);

  const loadFlow = async (id) => {
    try {
      showLoading('Cargando flow...');
      const res = await flowService.get(id);
      const flow = res.flow || res;
      setFlowName(flow.nombre || '');
      setFlowDesc(flow.descripcion || '');
      setFlowStatus(flow.status || 'draft');
      if (flow.definition?.nodes) {
        fitPendingRef.current = true;
        setNodes(flow.definition.nodes.map(n => ({
          id: n.id,
          type: 'flowNode',
          position: n.position || { x: 250, y: 50 },
          data: { tipo: n.type, label: n.data?.label || '', config: n.config || {} },
        })));
      }
      if (flow.definition?.edges) {
        setEdges(withEdgeIds(flow.definition.edges));
      }
    } catch (e) {
      toast.error('Error al cargar flow');
    } finally {
      hideLoading();
    }
  };

  const loadTemplate = (template) => {
    fitPendingRef.current = true;
    setNodes(template.nodes.map(n => ({
      ...n,
      type: 'flowNode',
      position: { ...n.position },
      data: { tipo: n.type, label: n.data?.label || '', config: n.config || {} },
    })));
    setEdges(withEdgeIds(template.edges));
    setShowTemplates(false);
    setFlowName(template.name);
    setFlowDesc(template.desc);
    toast.success(`Template "${template.name}" cargado`);
  };

  const onConnect = useCallback((params) => {
    setEdges((eds) => addEdge({ ...params, animated: true }, eds));
  }, [setEdges]);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event) => {
    event.preventDefault();
    const tipo = event.dataTransfer.getData('application/reactflow');
    if (!tipo || !reactFlowInstance) return;
    const position = reactFlowInstance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    const nc = NODE_TYPES_CONFIG[tipo];
    if (snapped) {
      position.x = Math.round(position.x / 20) * 20;
      position.y = Math.round(position.y / 20) * 20;
    }
    const newId = `node_${Date.now()}`;
    const newNode = {
      id: newId,
      type: 'flowNode',
      position,
      data: { tipo, label: '', config: { ...nc.defaultConfig } },
    };
    setNodes((nds) => nds.concat(newNode));
  }, [reactFlowInstance, setNodes, snapped]);

  // On narrow screens the node palette makes room for the properties panel.
  const collapsePaletteIfNarrow = () => {
    if (window.innerWidth < NARROW_SCREEN_PX) setShowPalette(false);
  };

  const onNodeClick = useCallback((_, node) => {
    setSelectedEdge(null);
    setSelectedNode(node);
    collapsePaletteIfNarrow();
  }, []);

  const onEdgeClick = useCallback((_, edge) => {
    setSelectedNode(null);
    setSelectedEdge(edge);
    collapsePaletteIfNarrow();
  }, []);

  const updateEdge = useCallback((edgeId, patch) => {
    setEdges((eds) => eds.map((e) => (e.id === edgeId ? { ...e, ...patch } : e)));
    setSelectedEdge((prev) => (prev && prev.id === edgeId ? { ...prev, ...patch } : prev));
  }, [setEdges]);

  const deleteSelectedEdge = useCallback(() => {
    if (!selectedEdge) return;
    setEdges((eds) => eds.filter((e) => e.id !== selectedEdge.id));
    setSelectedEdge(null);
  }, [selectedEdge, setEdges]);

  const onNodeDoubleClick = useCallback((_, node) => {
    if (reactFlowInstance) {
      reactFlowInstance.fitView({ nodes: [node], padding: 2, duration: 300 });
    }
  }, [reactFlowInstance]);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, []);

  const updateNodeConfig = useCallback((nodeId, key, value) => {
    setNodes((nds) => nds.map((n) => {
      if (n.id !== nodeId) return n;
      return { ...n, data: { ...n.data, [key]: value } };
    }));
    if (selectedNode?.id === nodeId) {
      setSelectedNode((prev) => prev ? { ...prev, data: { ...prev.data, [key]: value } } : null);
    }
  }, [setNodes, selectedNode]);

  const deleteSelectedNode = useCallback(() => {
    if (selectedNode) {
      setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
      setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
      setSelectedNode(null);
    }
  }, [selectedNode, setNodes, setEdges]);

  const duplicateSelected = useCallback(() => {
    if (!selectedNode || !reactFlowInstance) return;
    const newId = `node_${Date.now()}`;
    const pos = { x: selectedNode.position.x + 50, y: selectedNode.position.y + 50 };
    const newNode = {
      id: newId,
      type: 'flowNode',
      position: pos,
      data: { ...selectedNode.data, label: selectedNode.data.label + ' (copia)' },
    };
    setNodes((nds) => nds.concat(newNode));
  }, [selectedNode, reactFlowInstance, setNodes]);

  const selectAll = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.fitView({ padding: 0.2, duration: 300 });
    }
  }, [reactFlowInstance]);

  const getDefinition = () => ({
    nodes: nodes.map(n => ({
      id: n.id,
      type: n.data.tipo,
      config: n.data.config || {},
      data: { label: n.data.label || '' },
      position: n.position,
    })),
    edges: edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      condition: e.condition || '',
      label: e.label || '',
    })),
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const definition = getDefinition();
      if (flowId) {
        await flowService.update(flowId, { nombre: flowName, descripcion: flowDesc, definition });
        toast.success('Flow actualizado');
      } else {
        const res = await flowService.create({ nombre: flowName, descripcion: flowDesc, definition });
        toast.success('Flow creado');
        if (res?.flow?.id) {
          onBack && onBack(res.flow.id);
        }
      }
    } catch (e) {
      toast.error('Error al guardar flow');
    } finally {
      setSaving(false);
    }
  };

  const handleDeploy = async () => {
    if (!flowId) {
      toast.error('Guarda el flow primero');
      return;
    }
    try {
      await handleSave();
      await flowService.deploy(flowId);
      toast.success('Flow desplegado');
      setFlowStatus('published');
    } catch (e) {
      toast.error('Error al desplegar');
    }
  };

  return (
    <div className="flow-builder">
      <div className="flow-builder-header">
        <button className="btn-back" onClick={() => onBack()}><FiChevronLeft /> Volver</button>
        <div className="flow-builder-title">
          <input
            className="flow-name-input"
            value={flowName}
            onChange={e => setFlowName(e.target.value)}
            placeholder="Nombre del flow"
          />
          <span className={`status-badge ${flowStatus}`}>
            {flowStatus === 'published' ? 'Publicado' : 'Borrador'}
          </span>
        </div>
        <div className="flow-builder-actions">
          <button className="btn btn-outline btn-sm" onClick={undo} disabled={!canUndo} title="Deshacer">
            <FiRotateCcw />
          </button>
          <button className="btn btn-outline btn-sm" onClick={redo} disabled={!canRedo} title="Rehacer">
            <FiRepeat />
          </button>
          <button className={`btn btn-outline btn-sm ${snapped ? 'active' : ''}`} onClick={() => setSnapped(!snapped)} title="Snap a grid">
            <FiGrid />
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => setShowTemplates(true)} title="Plantillas">
            <FiLayers /> Templates
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => setShowPalette(!showPalette)}>
            <FiPlus /> Nodos
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
            <FiSave /> {saving ? 'Guardando...' : 'Guardar'}
          </button>
          {flowStatus !== 'published' && (
            <button className="btn btn-success btn-sm" onClick={handleDeploy}>
              <FiPlay /> Desplegar
            </button>
          )}
        </div>
      </div>

      <div className="flow-builder-body">
        <AnimatePresence>
          {showPalette && (
            <motion.div className="flow-palette" initial={{ width: 0, opacity: 0 }} animate={{ width: 200, opacity: 1 }} exit={{ width: 0, opacity: 0 }} onAnimationComplete={refit}>
              <div className="palette-header">Nodos</div>
              {Object.entries(NODE_TYPES_CONFIG).filter(([, cfg]) => allowed(cfg)).map(([tipo, cfg]) => (
                <div key={tipo} className="palette-item"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/reactflow', tipo);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                >
                  <span className="palette-icon" style={{ background: cfg.color }}>{cfg.icon}</span>
                  <span>{cfg.label}</span>
                </div>
              ))}
              <div className="palette-divider" />
              <div className="palette-header">Acciones</div>
              <div className="palette-item action" onClick={selectAll}><span className="palette-icon" style={{ background: 'var(--text-subtle)' }}>🔍</span><span>Ver todo</span></div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flow-canvas" ref={reactFlowWrapper}>
          <ReactFlowProvider>
            <CrewsContext.Provider value={crews}>
            <FlowCanvas
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onNodeClick={onNodeClick}
              onNodeDoubleClick={onNodeDoubleClick}
              onEdgeClick={onEdgeClick}
              onPaneClick={onPaneClick}
              setReactFlowInstance={setReactFlowInstance}
              showMiniMap={!selectedNode && !selectedEdge}
            />
            </CrewsContext.Provider>
          </ReactFlowProvider>
        </div>

        <AnimatePresence>
          {selectedNode && (
            <motion.div className="flow-properties" initial={{ width: 0, opacity: 0 }} animate={{ width: 280, opacity: 1 }} exit={{ width: 0, opacity: 0 }}>
              <div className="properties-header">
                <span>Propiedades</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={duplicateSelected} className="btn-icon" title="Duplicar"><FiCopy /></button>
                  <button onClick={deleteSelectedNode} className="btn-icon" title="Eliminar"><FiTrash2 /></button>
                </div>
              </div>
              <div className="properties-body">
                <label>Nombre
                  <input value={selectedNode.data.label || ''}
                    onChange={e => updateNodeConfig(selectedNode.id, 'label', e.target.value)}
                    placeholder="Nombre del nodo" />
                </label>
                <NodeProperties
                  nodes={nodes}
                  extensions={extensions}
                  crews={crews}
                  tipo={selectedNode.data.tipo}
                  config={selectedNode.data.config || {}}
                  onChange={(key, val) => {
                    const newConfig = { ...selectedNode.data.config, [key]: val };
                    updateNodeConfig(selectedNode.id, 'config', newConfig);
                  }}
                />
              </div>
            </motion.div>
          )}
          {selectedEdge && !selectedNode && (
            <motion.div className="flow-properties" initial={{ width: 0, opacity: 0 }} animate={{ width: 280, opacity: 1 }} exit={{ width: 0, opacity: 0 }}>
              <div className="properties-header">
                <span>Conexión</span>
                <button onClick={deleteSelectedEdge} className="btn-icon" title="Eliminar conexión"><FiTrash2 /></button>
              </div>
              <EdgeProperties edge={selectedEdge} intentOptions={intentOptions} onChange={(patch) => updateEdge(selectedEdge.id, patch)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showTemplates && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowTemplates(false)}>
            <motion.div className="modal" initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
              <div className="modal-header">
                <h2>Plantillas de Flujo</h2>
                <button className="modal-close" onClick={() => setShowTemplates(false)}><FiX /></button>
              </div>
              <div className="modal-body">
                <div className="templates-grid">
                  {FLOW_TEMPLATES.filter(allowed).map((t, i) => (
                    <div key={i} className="template-card" onClick={() => loadTemplate(t)}>
                      <div className="template-icon">📋</div>
                      <div className="template-info">
                        <h4>{t.name}</h4>
                        <p>{t.desc}</p>
                        <span className="template-meta">{t.nodes.length} nodos · {t.edges.length} conexiones</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EdgeProperties({ edge, intentOptions, onChange }) {
  const condition = edge.condition || '';
  const intentMatch = condition.match(/^intent == (\w+)$/);
  // A route to an intent no longer in the catalog still shows as such.
  const options = intentMatch && !intentOptions.some((o) => o.value === intentMatch[1])
    ? [...intentOptions, { value: intentMatch[1], label: `${intentMatch[1]} (no existe)` }]
    : intentOptions;
  const mode = !condition ? 'always'
    : condition === 'condition_result == true' ? 'cond_true'
    : condition === 'condition_result == false' ? 'cond_false'
    : intentMatch ? intentMatch[1] : 'custom';

  const setMode = (value) => {
    if (value === 'always') {
      onChange({ condition: '', label: '' });
    } else if (value === 'cond_true') {
      onChange({ condition: 'condition_result == true', label: 'Sí' });
    } else if (value === 'cond_false') {
      onChange({ condition: 'condition_result == false', label: 'No' });
    } else if (value === 'custom') {
      onChange({ condition: condition || 'context.variable == valor' });
    } else {
      const opt = options.find((o) => o.value === value);
      onChange({ condition: `intent == ${value}`, label: opt?.label || value });
    }
  };

  return (
    <div className="properties-body">
      <label>Seguir esta conexión cuando
        <select value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="always">Siempre (ruta por defecto)</option>
          <option value="cond_true">El nodo Condición se cumple (Sí)</option>
          <option value="cond_false">El nodo Condición no se cumple (No)</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>La intención es: {o.label}{o.activa === false ? ' (inactiva)' : ''}</option>
          ))}
          <option value="custom">Condición personalizada</option>
        </select>
      </label>
      {mode === 'custom' && (
        <label>Condición
          <input value={condition} onChange={(e) => onChange({ condition: e.target.value })} />
        </label>
      )}
      <label>Etiqueta
        <input value={edge.label || ''} onChange={(e) => onChange({ label: e.target.value })} placeholder="Texto en la conexión" />
      </label>
      <p className="help-text">En cada turno el agente recorre el flujo desde el inicio y se detiene en el primer nodo que responde. Primero se prueban las conexiones con condición; "Siempre" es la ruta por defecto.</p>
      {mode === 'custom' && <ConditionHelp />}
    </div>
  );
}

function ConditionHelp() {
  return (
    <div className="help-text">
      Operadores: <code>==</code> <code>!=</code> <code>&gt;</code> <code>&lt;</code> <code>&gt;=</code> <code>&lt;=</code> <code>contains</code> <code>exists</code> <code>not exists</code>, unidos con <code>and</code> / <code>or</code>.
      <br />Ej: <code>numero_cliente exists and saldo.data.deuda &gt; 0</code>
    </div>
  );
}

function VariablesHelp({ nodes }) {
  const vars = [...BUILTIN_VARIABLES, ...flowVariables(nodes || [])];
  return (
    <div className="variables-help">
      <span>Variables disponibles</span>
      <ul>
        {vars.map((v) => (
          <li key={v.name} title={v.desc}><code>{`{{${v.name}}}`}</code> <small>{v.desc}</small></li>
        ))}
      </ul>
    </div>
  );
}

function NodeProperties({ nodes, extensions, crews, tipo, config, onChange }) {
  const renderField = (key, label, type = 'text', opts = {}) => {
    const val = config[key] ?? '';
    switch (type) {
      case 'textarea':
        return (
          <label key={key}>{label}
            <textarea value={val} onChange={e => onChange(key, e.target.value)} rows={3} placeholder={opts.placeholder || ''} />
          </label>
        );
      case 'select':
        return (
          <label key={key}>{label}
            <select value={val} onChange={e => onChange(key, e.target.value)}>
              {opts.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
        );
      case 'number':
        return (
          <label key={key}>{label}
            <input type="number" value={val} onChange={e => onChange(key, parseFloat(e.target.value) || 0)} />
          </label>
        );
      default:
        return (
          <label key={key}>{label}
            <input value={val} onChange={e => onChange(key, e.target.value)} placeholder={opts.placeholder || label} />
          </label>
        );
    }
  };

  switch (tipo) {
    case 'saludo':
      return (
        <>
          {renderField('message', 'Mensaje de saludo', 'textarea')}
          <p className="help-text">Se dice al contestar. En los siguientes turnos este nodo solo reparte la conversación por sus conexiones.</p>
          <VariablesHelp nodes={nodes} />
        </>
      );
    case 'intent_classifier':
      return <p className="help-text">Clasifica la intención del usuario automáticamente. Las rutas se definen por las condiciones en las conexiones.</p>;
    case 'rag_query':
      return (
        <>
          {renderField('query', 'Búsqueda fija (opcional)', 'textarea')}
          {renderField('top_k', 'Fragmentos a usar', 'number')}
          <p className="help-text">Vacío: busca con lo que dijo quien llama. Solo consulta las categorías de conocimiento asignadas al agente (o toda la KB si no tiene).</p>
        </>
      );
    case 'llm_reply':
      return (
        <>
          {renderField('system_prompt', 'Instrucciones (vacío = prompt del agente)', 'textarea')}
          {renderField('temperature', 'Creatividad (0 a 1)', 'number')}
          <p className="help-text">Responde usando lo encontrado en "Consultar KB" y los datos capturados de la llamada.</p>
          <VariablesHelp nodes={nodes} />
        </>
      );
    case 'action_tool':
      return (
        <>
          {renderField('tool', 'Acción', 'select', {
            options: [
              { value: '', label: 'Seleccionar...' },
              { value: 'create_event', label: 'Agendar cita (IA)' },
              { value: 'cancel_event', label: 'Cancelar cita (IA)' },
              { value: 'reschedule_event', label: 'Reprogramar cita (IA)' },
              { value: 'list_events', label: 'Consultar citas (IA)' },
              { value: 'find_or_create_contact', label: 'Buscar/Crear contacto' },
            ]
          })}
          <p className="help-text">El asistente de citas conversa con quien llama: pide nombre, fecha y hora, y crea, cancela, reprograma o lee las citas en Agendas.</p>
        </>
      );
    case 'extract_data':
      return (
        <>
          {renderField('variable', 'Guardar en la variable', 'text', { placeholder: 'numero_cliente' })}
          {renderField('description', 'Qué dato capturar', 'textarea', { placeholder: 'Número de cliente de 4 a 8 dígitos' })}
          {renderField('data_type', 'Tipo de dato', 'select', { options: EXTRACT_TYPES })}
          {renderField('question', 'Pregunta si no lo dijo', 'textarea', { placeholder: '¿Me indica su número de cliente?' })}
          <p className="help-text">Saca el dato de lo que dice quien llama. Si falta, hace la pregunta y espera la respuesta; una vez capturado no se vuelve a preguntar en la llamada.</p>
        </>
      );
    case 'condition':
      return (
        <>
          {renderField('expression', 'Expresión', 'textarea', { placeholder: 'cliente.ok == true' })}
          <ConditionHelp />
          <p className="help-text">Conecta sus salidas con "se cumple (Sí)" y "no se cumple (No)".</p>
          <VariablesHelp nodes={nodes} />
        </>
      );
    case 'transfer': {
      const mode = config.mode || (config.destination ? 'extension' : 'queue');
      return (
        <>
          <label>Transferir a
            <select value={mode} onChange={(e) => onChange('mode', e.target.value)}>
              <option value="queue">Agentes de la campaña (balanceo + espera)</option>
              <option value="extension">Una extensión específica</option>
            </select>
          </label>
          {mode === 'extension' && (
            <label>Extensión
              <select value={config.destination || ''} onChange={(e) => onChange('destination', e.target.value)}>
                <option value="">Seleccionar...</option>
                {(extensions || []).map((e) => (
                  <option key={e.id || e.extension} value={e.extension}>{e.extension} · {e.nombre}</option>
                ))}
              </select>
            </label>
          )}
          {renderField('message', 'Mensaje antes de transferir', 'textarea')}
          {mode === 'queue' ? (
            <p className="help-text">Se entrega al agente libre de la campaña que lleva más tiempo sin llamada (teléfono conectado, sin llamada y <strong>Disponible</strong> en el portal). Si no hay ninguno, quien llama espera con música y al cumplirse la espera máxima vuelve el agente IA. Los agentes y la espera se configuran en la pestaña <strong>Agentes humanos</strong> de la campaña.</p>
          ) : (
            <p className="help-text">Pasa la llamada directamente a esa extensión. Si la transferencia falla, el agente IA sigue atendiendo.</p>
          )}
        </>
      );
    }
    case 'crew_agent': {
      const crew = (crews || []).find((c) => c.id === config.crew_id);
      return (
        <>
          <label>Equipo de agentes
            <select value={config.crew_id || ''} onChange={(e) => onChange('crew_id', e.target.value)}>
              <option value="">Seleccionar...</option>
              {(crews || []).map((c) => (
                <option key={c.id} value={c.id}>{c.nombre} · {c.settings?.engine === 'langchain' ? 'LangChain' : `CrewAI, ${c.agents?.length || 0} ${c.agents?.length === 1 ? 'agente' : 'agentes'}`}</option>
              ))}
            </select>
          </label>
          {(crews || []).length === 0 && (
            <p className="help-text">Aún no hay equipos. Créalos en la pestaña <strong>Equipos IA</strong> de la campaña.</p>
          )}
          {crew?.descripcion && <p className="help-text">{crew.descripcion}</p>}
          {renderField('instructions', 'Instrucciones para esta tarea (opcional)', 'textarea', { placeholder: 'El cliente {{nombre}} quiere saber su saldo; ofrécele un plan de pago.' })}
          {renderField('output', 'Con la respuesta del equipo', 'select', {
            options: [
              { value: 'reply', label: 'Decírsela a quien llama' },
              { value: 'variable', label: 'Guardarla en una variable y seguir el flujo' },
            ]
          })}
          {config.output === 'variable' && renderField('result_var', 'Guardar en la variable')}
          <p className="help-text">El equipo recibe lo que dijo quien llama, el historial y las variables de la llamada. Si se pasa del tiempo máximo del equipo, el agente se disculpa. Cada ejecución queda en Equipos IA → Monitoreo.</p>
          <VariablesHelp nodes={nodes} />
        </>
      );
    }
    case 'despedida':
      return (
        <>
          {renderField('message', 'Mensaje de despedida', 'textarea')}
          <p className="help-text">Dice el mensaje y cuelga.</p>
        </>
      );
    case 'set_variable':
      return (
        <>
          {renderField('key', 'Nombre de variable')}
          {renderField('value', 'Valor (acepta {{variables}})')}
          <VariablesHelp nodes={nodes} />
        </>
      );
    case 'webhook':
      return (
        <>
          {renderField('method', 'Método HTTP', 'select', {
            options: [
              { value: 'GET', label: 'GET' },
              { value: 'POST', label: 'POST' },
              { value: 'PUT', label: 'PUT' },
              { value: 'PATCH', label: 'PATCH' },
              { value: 'DELETE', label: 'DELETE' },
            ]
          })}
          {renderField('url', 'URL (acepta {{variables}})', 'text', { placeholder: 'https://api.miempresa.com/clientes/{{numero_cliente}}' })}
          {renderField('headers', 'Cabeceras (JSON)', 'textarea', { placeholder: '{"Authorization": "Bearer TU_TOKEN"}' })}
          {renderField('body', 'Cuerpo (JSON)', 'textarea', { placeholder: '{"telefono": "{{caller_number}}", "mensaje": "{{transcript_text}}"}' })}
          {renderField('result_var', 'Guardar respuesta en la variable')}
          {renderField('message', 'Responder con (opcional)', 'textarea', { placeholder: 'Su saldo es de {{webhook.data.saldo}} quetzales.' })}
          {renderField('message_error', 'Si falla, responder (opcional)', 'textarea', { placeholder: 'No pude consultar el sistema en este momento.' })}
          <p className="help-text">
            La respuesta queda en <code>{`{{${config.result_var || 'webhook'}.data}}`}</code> (y <code>.ok</code>, <code>.status</code>).
            Ej. respuesta: <code>{`Su saldo es {{${config.result_var || 'webhook'}.data.saldo}}`}</code>. Sin mensaje, el flujo sigue al siguiente nodo.
            Solo se permiten URLs públicas http/https.
          </p>
          <VariablesHelp nodes={nodes} />
        </>
      );
    default:
      return null;
  }
}

export default FlowBuilder;
