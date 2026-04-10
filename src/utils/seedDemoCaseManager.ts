/**
 * Demo Case Manager Seed
 *
 * One-shot helper that injects a rich set of fake case-manager content
 * (connection, notes, tasks, messages) into the local state so a pilot
 * partner can see the full Case Manager experience without needing to
 * actually pair a real case worker.
 *
 * Used by:
 *  - The "Try demo" card on the main dashboard
 *  - The "Try Demo Connection" button on the Case Manager → Connect tab
 *
 * Replace this with a real backend call once Supabase is wired in.
 */

import type { Dispatch } from 'react';

interface DemoSeedOptions {
  isSpanish: boolean;
}

export const seedDemoCaseManager = (
  dispatch: Dispatch<any>,
  options: DemoSeedOptions = { isSpanish: false },
) => {
  const { isSpanish } = options;
  const caseManagerName = 'Sarah Johnson';
  const caseManagerId = 'demo-cm-1';

  // 1. Connection
  dispatch({
    type: 'SET_CM_CONNECTION',
    payload: {
      id: caseManagerId,
      caseManagerId,
      caseManagerName,
      caseManagerEmail: 'sarah.j@shelter.org',
      connectedAt: new Date().toISOString(),
      status: 'active',
    },
  });

  // 2. Welcome message + a small back-and-forth conversation
  const messages = isSpanish
    ? [
        'Hola, soy Sarah, tu gestora de caso. Estoy aquí para ayudarte. ¿Cómo te encuentras hoy?',
        '¡Hola Sarah! Necesito ayuda para encontrar refugio esta semana.',
        'Por supuesto. He agregado algunas tareas a tu lista — empieza llamando al 211. También te dejé una nota con los pasos.',
        'Gracias, lo haré hoy.',
      ]
    : [
        "Hi, I'm Sarah, your case manager. I'm here to help you. How are you doing today?",
        'Hi Sarah! I need help finding shelter this week.',
        "Of course. I've added a few tasks to your list — start with calling 211. I also left you a note with the steps.",
        "Thanks, I'll do that today.",
      ];

  messages.forEach((content, idx) => {
    dispatch({
      type: 'ADD_CM_MESSAGE',
      payload: {
        senderId: idx % 2 === 0 ? caseManagerId : 'user',
        senderType: idx % 2 === 0 ? 'caseManager' : 'user',
        senderName: idx % 2 === 0 ? caseManagerName : 'You',
        content,
        read: false,
      },
    });
  });

  // 3. Tasks — mix of pending + one already completed
  const tasks = isSpanish
    ? [
        {
          title: 'Llamar al 211 para refugio',
          description:
            'Pregunta sobre disponibilidad de camas y horarios de check-in.',
          category: 'housing' as const,
          priority: 'high' as const,
          status: 'pending' as const,
        },
        {
          title: 'Reunir documentos: ID y Seguro Social',
          description:
            'Los necesitarás para Medicaid y la solicitud de Sección 8.',
          category: 'documents' as const,
          priority: 'medium' as const,
          status: 'pending' as const,
        },
        {
          title: 'Aplicar para Medicaid en healthcare.gov',
          description:
            'Esto te dará cobertura médica gratuita o de bajo costo.',
          category: 'healthcare' as const,
          priority: 'medium' as const,
          status: 'pending' as const,
        },
        {
          title: 'Actualizar currículum',
          description: 'Agregar experiencia laboral reciente.',
          category: 'employment' as const,
          priority: 'low' as const,
          status: 'completed' as const,
        },
      ]
    : [
        {
          title: 'Call 211 for shelter info',
          description:
            'Ask about bed availability and check-in times.',
          category: 'housing' as const,
          priority: 'high' as const,
          status: 'pending' as const,
        },
        {
          title: 'Gather documents: ID and Social Security card',
          description:
            "You'll need these for Medicaid and the Section 8 application.",
          category: 'documents' as const,
          priority: 'medium' as const,
          status: 'pending' as const,
        },
        {
          title: 'Apply for Medicaid at healthcare.gov',
          description:
            'This will give you free or low-cost health coverage.',
          category: 'healthcare' as const,
          priority: 'medium' as const,
          status: 'pending' as const,
        },
        {
          title: 'Update resume',
          description: 'Add recent work experience.',
          category: 'employment' as const,
          priority: 'low' as const,
          status: 'completed' as const,
        },
      ];

  tasks.forEach((t) => {
    dispatch({
      type: 'ADD_CM_TASK',
      payload: {
        ...t,
        assignedBy: 'caseManager',
        assignedByName: caseManagerName,
      },
    });
  });

  // 4. Notes — three rich notes covering welcome, an action plan, and
  // a follow-up after the first meeting
  const notes = isSpanish
    ? [
        {
          title: '👋 Bienvenido/a',
          content:
            'Soy Sarah, tu gestora de caso. Mi trabajo es ayudarte a navegar los recursos de vivienda, salud y empleo. Puedes mensajearme aquí cuando quieras y te responderé lo antes posible.',
        },
        {
          title: 'Tu plan para esta semana',
          content:
            '1) Llama al 211 hoy para refugio.\n2) Reúne tu ID y tarjeta de Seguro Social.\n3) Aplica para Medicaid el viernes.\n\nSi necesitas ayuda con cualquier paso, mensajéame.',
        },
        {
          title: 'Notas de nuestra primera reunión',
          content:
            'Objetivo principal: vivienda estable. Interesado/a en programas de capacitación laboral. Próximo paso: conectar con el programa de refugios locales y agendar una cita en el centro de salud comunitario.',
        },
      ]
    : [
        {
          title: '👋 Welcome',
          content:
            "I'm Sarah, your case manager. My job is to help you navigate housing, health, and employment resources. You can message me here anytime and I'll respond as soon as I can.",
        },
        {
          title: 'Your plan for this week',
          content:
            '1) Call 211 today for shelter.\n2) Gather your ID and Social Security card.\n3) Apply for Medicaid by Friday.\n\nIf you need help with any step, message me.',
        },
        {
          title: 'Notes from our first meeting',
          content:
            'Primary goal: stable housing. Interested in job training programs. Next step: connect with the local shelter program and schedule an appointment at the community health center.',
        },
      ];

  notes.forEach((n) => {
    dispatch({
      type: 'ADD_CM_NOTE',
      payload: {
        ...n,
        createdBy: 'caseManager',
        createdByName: caseManagerName,
        isPrivate: false,
      },
    });
  });
};
