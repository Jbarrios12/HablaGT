// Configuración compartida de Form.io: estilos, idioma y opciones del builder.
// Se importa solo desde el módulo de Formularios (lazy), así Bootstrap y
// Form.io no pesan en el bundle inicial de la app.
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import '@formio/js/dist/formio.full.min.css';
import { Formio } from '@formio/js';
import { Evaluator as CoreEvaluator } from '@formio/core/utils';

// Seguridad: Form.io ejecuta como JavaScript lo que un formulario trae en
// "calculateValue", "customConditional", "validate.custom", lógica, etc.
// Cualquier usuario puede crear formularios, y quien los abre (un supervisor
// en la vista previa, un agente en una llamada) ejecutaría ese código con su
// sesión. Con noeval no se ejecuta nada: siguen funcionando los campos, las
// validaciones normales, las condiciones simples y JSONLogic.
Formio.Evaluator.noeval = true;
CoreEvaluator.noeval = true;

// Traducciones para el render de formularios (validaciones, botones, wizard).
export const formioI18n = {
  es: {
    submit: 'Enviar',
    cancel: 'Cancelar',
    next: 'Siguiente',
    previous: 'Anterior',
    complete: 'Formulario enviado',
    error: 'Corrige los siguientes errores antes de enviar.',
    errorListHotkey: 'Presiona Ctrl + Alt + X para volver a la lista de errores.',
    required: '{{field}} es obligatorio',
    unique: '{{field}} debe ser único',
    pattern: '{{field}} no cumple el formato {{pattern}}',
    minLength: '{{field}} debe tener al menos {{length}} caracteres.',
    maxLength: '{{field}} debe tener como máximo {{length}} caracteres.',
    minWords: '{{field}} debe tener al menos {{length}} palabras.',
    maxWords: '{{field}} debe tener como máximo {{length}} palabras.',
    min: '{{field}} no puede ser menor que {{min}}.',
    max: '{{field}} no puede ser mayor que {{max}}.',
    invalid_email: '{{field}} debe ser un correo válido.',
    invalid_url: '{{field}} debe ser una URL válida.',
    invalid_date: '{{field}} no es una fecha válida.',
    invalid_day: '{{field}} no es un día válido.',
    invalid_regex: '{{field}} no cumple el formato {{regex}}.',
    mask: '{{field}} no coincide con la máscara.',
    maxDate: '{{field}} no puede ser posterior a {{- maxDate}}',
    minDate: '{{field}} no puede ser anterior a {{- minDate}}',
    stripe: '{{stripe}}',
    month: 'Mes',
    day: 'Día',
    year: 'Año',
    january: 'Enero', february: 'Febrero', march: 'Marzo', april: 'Abril',
    may: 'Mayo', june: 'Junio', july: 'Julio', august: 'Agosto',
    september: 'Septiembre', october: 'Octubre', november: 'Noviembre', december: 'Diciembre',
    yes: 'Sí',
    no: 'No',
    'Add Another': 'Agregar otro',
    'Type to search': 'Escribe para buscar',
    'No results found': 'Sin resultados',
    'No choices to choose from': 'No hay opciones',
  },
};

export const formOptions = { language: 'es', i18n: formioI18n };

// Textos del panel lateral del constructor.
const builderI18n = {
  es: {
    ...formioI18n.es,
    searchFields: 'Buscar campos…',
    'No Matches Found': 'Sin coincidencias',
    'Drag and Drop a form component': 'Arrastra aquí un campo',
    Basic: 'Básicos',
    Advanced: 'Avanzados',
    Layout: 'Diseño',
    Data: 'Datos',
    'Text Field': 'Texto',
    'Text Area': 'Área de texto',
    Number: 'Número',
    Password: 'Contraseña',
    Checkbox: 'Casilla',
    'Select Boxes': 'Casillas múltiples',
    Select: 'Lista desplegable',
    Radio: 'Opción única',
    Button: 'Botón',
    Email: 'Correo',
    Url: 'URL',
    'Phone Number': 'Teléfono',
    Tags: 'Etiquetas',
    Address: 'Dirección',
    'Date / Time': 'Fecha / hora',
    Day: 'Día',
    Time: 'Hora',
    Currency: 'Moneda',
    Survey: 'Encuesta',
    Signature: 'Firma',
    'HTML Element': 'Elemento HTML',
    Content: 'Contenido',
    Columns: 'Columnas',
    'Field Set': 'Grupo de campos',
    Panel: 'Panel',
    Table: 'Tabla',
    Tabs: 'Pestañas',
    Well: 'Recuadro',
    Hidden: 'Oculto',
    Container: 'Contenedor',
    'Data Map': 'Mapa de datos',
    'Data Grid': 'Tabla de datos',
    'Edit Grid': 'Tabla editable',
    Save: 'Guardar',
    Cancel: 'Cancelar',
    Remove: 'Eliminar',
    Preview: 'Vista previa',
    Help: 'Ayuda',
  },
};

// Builder: sin los grupos que requieren un servidor Form.io (Premium, Recursos).
export const builderOptions = {
  language: 'es',
  i18n: builderI18n,
  noNewEdit: false,
  builder: {
    premium: false,
    resource: false,
  },
};

// Plantillas para arrancar rápido. Pensadas para contact center.
export const FORM_TEMPLATES = [
  {
    key: 'blank',
    label: 'En blanco',
    description: 'Empieza desde cero',
    components: [],
  },
  {
    key: 'post-call',
    label: 'Encuesta post-llamada',
    description: 'Satisfacción del cliente al terminar la llamada',
    components: [
      { type: 'textfield', key: 'nombre', label: 'Nombre del cliente', input: true, validate: { required: true } },
      { type: 'phoneNumber', key: 'telefono', label: 'Teléfono', input: true, inputMask: '9999-9999' },
      {
        type: 'radio', key: 'satisfaccion', label: '¿Qué tan satisfecho quedó con la atención?', input: true,
        inline: true, validate: { required: true },
        values: [
          { label: 'Muy insatisfecho', value: '1' }, { label: 'Insatisfecho', value: '2' },
          { label: 'Neutral', value: '3' }, { label: 'Satisfecho', value: '4' },
          { label: 'Muy satisfecho', value: '5' },
        ],
      },
      { type: 'checkbox', key: 'resuelto', label: '¿Se resolvió su consulta?', input: true },
      { type: 'textarea', key: 'comentarios', label: 'Comentarios', input: true },
      { type: 'button', key: 'submit', label: 'Enviar', action: 'submit', input: true, theme: 'primary' },
    ],
  },
  {
    key: 'lead',
    label: 'Registro de lead',
    description: 'Captura de datos de un prospecto',
    components: [
      {
        type: 'columns', key: 'cols', input: false,
        columns: [
          { width: 6, components: [{ type: 'textfield', key: 'nombre', label: 'Nombre', input: true, validate: { required: true } }] },
          { width: 6, components: [{ type: 'textfield', key: 'empresa', label: 'Empresa', input: true }] },
        ],
      },
      { type: 'email', key: 'email', label: 'Correo', input: true },
      { type: 'phoneNumber', key: 'telefono', label: 'Teléfono', input: true, inputMask: '9999-9999', validate: { required: true } },
      {
        type: 'select', key: 'interes', label: 'Interés', input: true, widget: 'choicesjs',
        data: { values: [
          { label: 'Plan básico', value: 'basico' },
          { label: 'Plan profesional', value: 'profesional' },
          { label: 'Plan empresarial', value: 'empresarial' },
        ] },
      },
      { type: 'datetime', key: 'seguimiento', label: 'Fecha de seguimiento', input: true },
      { type: 'textarea', key: 'notas', label: 'Notas', input: true },
      { type: 'button', key: 'submit', label: 'Guardar lead', action: 'submit', input: true, theme: 'primary' },
    ],
  },
];
