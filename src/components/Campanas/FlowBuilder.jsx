import { useState, useCallback, useRef, useEffect } from 'react';
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
import { flowService } from '../../services';
import { useToast } from '../../context/ToastContext';
import { useLoading } from '../../context/LoadingContext';

const NODE_TYPES_CONFIG = {
  saludo:            { label: 'Saludo',        color: '#3b82f6', icon: '👋', defaultConfig: { message: '¡Hola! ¿En qué puedo ayudarle?' } },
  intent_classifier: { label: 'Clasificar',    color: '#8b5cf6', icon: '🎯', defaultConfig: {} },
  rag_query:         { label: 'Consultar KB',  color: '#10b981', icon: '📚', defaultConfig: { top_k: 3 } },
  llm_reply:         { label: 'Respuesta LLM', color: '#f59e0b', icon: '🤖', defaultConfig: { temperature: 0.4 } },
  action_tool:       { label: 'Acción',        color: '#ef4444', icon: '⚡', defaultConfig: { tool: '', params: {} } },
  condition:         { label: 'Condición',     color: '#ec4899', icon: '🔀', defaultConfig: { expression: '' } },
  transfer:          { label: 'Transferir',    color: '#f97316', icon: '📞', defaultConfig: { destination: 'general_queue', message: 'Le transferiré con un agente.' } },
  despedida:         { label: 'Despedida',     color: '#64748b', icon: '👋', defaultConfig: { message: 'Gracias por llamar. ¡Que tenga un buen día!' } },
  set_variable:      { label: 'Set Variable',  color: '#14b8a6', icon: '📝', defaultConfig: { key: '', value: '' } },
  webhook:           { label: 'Webhook',       color: '#6366f1', icon: '🔗', defaultConfig: { url: '', method: 'POST' } },
};

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
    desc: 'Clasificar → agendar/cancelar con tools → confirmar → despedida',
    nodes: [
      { id: 'start', type: 'intent_classifier', config: {}, data: { label: '' }, position: { x: 300, y: 20 } },
      { id: 'saludo', type: 'saludo', config: { message: 'Bienvenido. ¿Necesita agendar o cancelar una cita?' }, data: { label: 'Saludo' }, position: { x: 160, y: 140 } },
      { id: 'agendar', type: 'action_tool', config: { tool: 'create_event' }, data: { label: 'Agendar' }, position: { x: 40, y: 260 } },
      { id: 'cancelar', type: 'action_tool', config: { tool: 'cancel_event' }, data: { label: 'Cancelar' }, position: { x: 280, y: 260 } },
      { id: 'llm', type: 'llm_reply', config: { temperature: 0.3 }, data: { label: 'Confirmar' }, position: { x: 160, y: 380 } },
      { id: 'despedida', type: 'despedida', config: { message: 'Su cita ha sido procesada. ¡Gracias!' }, data: { label: 'Despedida' }, position: { x: 160, y: 500 } },
    ],
    edges: [
      { source: 'start', target: 'saludo', condition: 'intent == saludo', label: '' },
      { source: 'saludo', target: 'agendar', condition: 'intent == agendar_cita', label: 'Agendar' },
      { source: 'saludo', target: 'cancelar', condition: 'intent == cancelar_cita', label: 'Cancelar' },
      { source: 'agendar', target: 'llm', condition: '', label: '' },
      { source: 'cancelar', target: 'llm', condition: '', label: '' },
      { source: 'llm', target: 'despedida', condition: '', label: '' },
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

function FlowNode({ data, selected }) {
  const config = NODE_TYPES_CONFIG[data.tipo] || { label: data.tipo, color: '#94a3b8', icon: '❓' };
  return (
    <div className={`flow-node ${selected ? 'selected' : ''}`} style={{ borderColor: config.color }}>
      <Handle type="target" position={Position.Top} />
      <div className="flow-node-header" style={{ background: config.color }}>
        <span>{config.icon}</span>
        <span>{config.label}</span>
      </div>
      <div className="flow-node-body">
        {data.label && <div className="flow-node-label">{data.label}</div>}
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

function FlowCanvas({ nodes, edges, onNodesChange, onEdgesChange, onConnect, onDrop, onDragOver, onNodeClick, onNodeDoubleClick, onPaneClick, setReactFlowInstance, showTemplateModal }) {
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
      onPaneClick={onPaneClick}
      onInit={setReactFlowInstance}
      nodeTypes={nodeTypes}
      fitView
      attributionPosition="bottom-left"
    >
      <Controls />
      <Background variant="dots" gap={20} size={1} />
      <MiniMap nodeStrokeColor="#3b82f6" nodeColor="#e2e8f0" />
    </ReactFlow>
  );
}

function FlowBuilder({ flowId, onBack }) {
  const toast = useToast();
  const { showLoading, hideLoading } = useLoading();
  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [flowName, setFlowName] = useState('');
  const [flowDesc, setFlowDesc] = useState('');
  const [flowStatus, setFlowStatus] = useState('draft');
  const [showPalette, setShowPalette] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snapped, setSnapped] = useState(false);

  const { undo, redo, canUndo, canRedo } = useUndoRedo(nodes, edges, setNodes, setEdges);

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
        setNodes(flow.definition.nodes.map(n => ({
          id: n.id,
          type: 'flowNode',
          position: n.position || { x: 250, y: 50 },
          data: { tipo: n.type, label: n.data?.label || '', config: n.config || {} },
        })));
      }
      if (flow.definition?.edges) {
        setEdges(flow.definition.edges);
      }
    } catch (e) {
      toast.error('Error al cargar flow');
    } finally {
      hideLoading();
    }
  };

  const loadTemplate = (template) => {
    setNodes(template.nodes.map(n => ({
      ...n,
      type: 'flowNode',
      position: { ...n.position },
      data: { tipo: n.type, label: n.data?.label || '', config: n.config || {} },
    })));
    setEdges(template.edges);
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

  const onNodeClick = useCallback((_, node) => {
    setSelectedNode(node);
  }, []);

  const onNodeDoubleClick = useCallback((_, node) => {
    if (reactFlowInstance) {
      reactFlowInstance.fitView({ nodes: [node], padding: 2, duration: 300 });
    }
  }, [reactFlowInstance]);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
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
        <button className="btn-back" onClick={onBack}><FiChevronLeft /> Volver</button>
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
            <motion.div className="flow-palette" initial={{ width: 0, opacity: 0 }} animate={{ width: 200, opacity: 1 }} exit={{ width: 0, opacity: 0 }}>
              <div className="palette-header">Nodos</div>
              {Object.entries(NODE_TYPES_CONFIG).map(([tipo, cfg]) => (
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
              <div className="palette-item action" onClick={selectAll}><span className="palette-icon" style={{ background: '#94a3b8' }}>🔍</span><span>Ver todo</span></div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flow-canvas" ref={reactFlowWrapper}>
          <ReactFlowProvider>
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
              onPaneClick={onPaneClick}
              setReactFlowInstance={setReactFlowInstance}
            />
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
                  {FLOW_TEMPLATES.map((t, i) => (
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

function NodeProperties({ tipo, config, onChange }) {
  const renderField = (key, label, type = 'text', opts = {}) => {
    const val = config[key] ?? '';
    switch (type) {
      case 'textarea':
        return (
          <label key={key}>{label}
            <textarea value={val} onChange={e => onChange(key, e.target.value)} rows={3} />
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
            <input value={val} onChange={e => onChange(key, e.target.value)} placeholder={label} />
          </label>
        );
    }
  };

  switch (tipo) {
    case 'saludo':
      return renderField('message', 'Mensaje de saludo', 'textarea');
    case 'intent_classifier':
      return <p className="help-text">Clasifica la intención del usuario automáticamente. Las rutas se definen por las condiciones en las conexiones.</p>;
    case 'rag_query':
      return (
        <>
          {renderField('query', 'Query personalizada', 'textarea')}
          {renderField('top_k', 'Resultados', 'number')}
          <p className="help-text">Deja la query vacía para usar el transcript del usuario.</p>
        </>
      );
    case 'llm_reply':
      return (
        <>
          {renderField('system_prompt', 'Prompt del sistema', 'textarea')}
          {renderField('temperature', 'Temperatura', 'number')}
        </>
      );
    case 'action_tool':
      return (
        <>
          {renderField('tool', 'Acción', 'select', {
            options: [
              { value: '', label: 'Seleccionar...' },
              { value: 'list_events', label: 'Listar eventos' },
              { value: 'create_event', label: 'Crear evento' },
              { value: 'cancel_event', label: 'Cancelar evento' },
              { value: 'find_or_create_contact', label: 'Buscar/Crear contacto' },
            ]
          })}
        </>
      );
    case 'condition':
      return (
        <>
          {renderField('expression', 'Expresión', 'textarea')}
          <p className="help-text">Ej: context.var == "valor". Las conexiones definen las rutas (Sí/No).</p>
        </>
      );
    case 'transfer':
      return (
        <>
          {renderField('destination', 'Destino / Cola')}
          {renderField('message', 'Mensaje', 'textarea')}
        </>
      );
    case 'despedida':
      return renderField('message', 'Mensaje de despedida', 'textarea');
    case 'set_variable':
      return (
        <>
          {renderField('key', 'Nombre de variable')}
          {renderField('value', 'Valor')}
        </>
      );
    case 'webhook':
      return (
        <>
          {renderField('url', 'URL del webhook')}
          {renderField('method', 'Método HTTP', 'select', {
            options: [
              { value: 'GET', label: 'GET' },
              { value: 'POST', label: 'POST' },
              { value: 'PUT', label: 'PUT' },
              { value: 'PATCH', label: 'PATCH' },
              { value: 'DELETE', label: 'DELETE' },
            ]
          })}
          {renderField('result_var', 'Variable de resultado')}
        </>
      );
    default:
      return null;
  }
}

export default FlowBuilder;
