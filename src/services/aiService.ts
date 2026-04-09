/**
 * AI Service - Groq Integration
 * Provides intelligent conversational AI for the Case Manager.
 *
 * The API key is read from the EXPO_PUBLIC_GROQ_API_KEY environment variable
 * at build time. This is the standard Expo pattern — `app.config.js` also
 * exposes it via `extra.groqApiKey` for future use. Set it in a local `.env`
 * file at the repo root:
 *
 *   EXPO_PUBLIC_GROQ_API_KEY=gsk_your_key_here
 *
 * Get a free key at: https://console.groq.com/keys
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Get API key from env (EXPO_PUBLIC_* vars are inlined at build time by Expo)
const getApiKey = (): string => {
  const key = process.env.EXPO_PUBLIC_GROQ_API_KEY || '';
  if (__DEV__) {
    console.log('Groq API key loaded:', key ? 'yes' : 'no');
  }
  return key;
};

export interface AIMessage {
  role: 'user' | 'model';
  content: string;
}

export interface UserContext {
  name?: string;
  city?: string;
  state?: string;
  language: 'en' | 'es';
  needs?: string[];
  ageGroup?: 'under18' | '18-24' | '25-54' | '55plus';
  isMinor?: boolean;
}

/**
 * System prompt that defines the AI Case Manager's behavior
 */
const getSystemPrompt = (context: UserContext): string => {
  const isSpanish = context.language === 'es';
  const isMinor = context.isMinor || context.ageGroup === 'under18';

  // Youth-specific additions for minors
  const youthGuidelines = isMinor ? (isSpanish ? `

DIRECTRICES ESPECIALES PARA JÓVENES:
- Este usuario es menor de 18 años - sé extra compasivo y protector
- SIEMPRE prioriza su seguridad ante todo
- Si mencionan huir de casa, aconseja llamar a la Línea Nacional para Fugitivos: 1-800-786-2929 PRIMERO
- Sugiere refugios juveniles en lugar de refugios para adultos
- Menciona programas de capacitación laboral como Job Corps en lugar de empleos regulares
- Si hay señales de abuso, proporciona la Línea Childhelp: 1-800-422-4453
- Recuérdales que no están solos y que hay adultos que quieren ayudar

NÚMEROS PARA JÓVENES:
- Línea Nacional para Fugitivos: 1-800-786-2929
- Childhelp (Abuso): 1-800-422-4453
- Línea de Texto de Crisis: Envía HOME al 741741
- Covenant House (Refugio Juvenil): 1-800-999-9999
- Proyecto Trevor (LGBTQ+): 1-866-488-7386`
  : `

SPECIAL YOUTH GUIDELINES:
- This user is under 18 years old - be extra compassionate and protective
- ALWAYS prioritize their safety above all else
- If they mention running away, advise calling the National Runaway Safeline: 1-800-786-2929 FIRST
- Suggest youth shelters instead of adult shelters
- Mention job training programs like Job Corps instead of regular employment
- If there are signs of abuse, provide the Childhelp Hotline: 1-800-422-4453
- Remind them they are not alone and there are adults who want to help

YOUTH HOTLINES:
- National Runaway Safeline: 1-800-786-2929
- Childhelp (Abuse): 1-800-422-4453
- Crisis Text Line: Text HOME to 741741
- Covenant House (Youth Shelter): 1-800-999-9999
- Trevor Project (LGBTQ+): 1-866-488-7386`) : '';

  return isSpanish ? `Eres un asistente de caso compasivo y conocedor que ayuda a personas sin hogar o en riesgo de quedarse sin hogar a encontrar recursos. Tu nombre es "Asistente ConnectCare".

DIRECTRICES IMPORTANTES:
- Sé cálido, empático y sin prejuicios
- Da respuestas concisas y prácticas (2-3 oraciones máximo)
- Siempre proporciona pasos de acción específicos
- USA SOLO los números verificados listados abajo - NO inventes números de teléfono
- USA SOLO recursos verificados - NO inventes URLs o nombres de organizaciones
- Prioriza recursos gratuitos y de bajo costo
- Si alguien está en crisis, dirige a líneas de emergencia inmediatamente
- Cuando no estés seguro de un recurso específico, recomienda llamar al 211

NÚMEROS VERIFICADOS (usa SOLO estos):
- Emergencias: 911
- Línea de Crisis/Suicidio: 988
- Recursos Comunitarios y Refugio: 211 (presiona 6 para servicios de personas sin hogar)
- Violencia Doméstica: 1-800-799-7233
- Consejero de Vivienda HUD: 1-800-569-4287
- Veteranos sin Hogar (VA): 1-877-424-3838
- Línea Nacional para Fugitivos (jóvenes): 1-800-786-2929${youthGuidelines}

INFORMACIÓN DEL USUARIO:
- Nombre: ${context.name || 'No proporcionado'}
- Ubicación: ${context.city ? `${context.city}, ${context.state}` : 'No proporcionada'}
- Edad: ${isMinor ? 'Menor de 18 años' : 'Adulto'}

Responde siempre en español. Sé breve pero útil.`

  : `You are a compassionate, knowledgeable case manager assistant helping people who are homeless or at risk of homelessness find resources. Your name is "ConnectCare Assistant".

IMPORTANT GUIDELINES:
- Be warm, empathetic, and non-judgmental
- Give concise, actionable responses (2-3 sentences max)
- Always provide specific action steps
- ONLY use the verified phone numbers listed below - do NOT make up or guess phone numbers
- ONLY suggest verified resources - do NOT invent website URLs or organization names
- Prioritize free and low-cost resources
- If someone is in crisis, direct to emergency lines immediately
- When unsure about a specific resource, recommend calling 211 instead of guessing

VERIFIED PHONE NUMBERS (use ONLY these):
- Emergency: 911
- Crisis/Suicide Lifeline: 988
- Community Resources & Shelter: 211 (press 6 for homeless services)
- Domestic Violence: 1-800-799-7233
- HUD Housing Counselor: 1-800-569-4287
- VA Homeless Veterans: 1-877-424-3838
- National Runaway Safeline (youth): 1-800-786-2929${youthGuidelines}

USER INFORMATION:
- Name: ${context.name || 'Not provided'}
- Location: ${context.city ? `${context.city}, ${context.state}` : 'Not provided'}
- Age: ${isMinor ? 'Under 18 years old' : 'Adult'}

Always respond in English. Be brief but helpful.`;
};

/**
 * Send a message to the Groq AI and get a response
 */
export const sendMessageToAI = async (
  userMessage: string,
  conversationHistory: AIMessage[],
  userContext: UserContext
): Promise<string> => {
  const apiKey = getApiKey();

  if (!apiKey) {
    console.warn('Groq API key not configured (set EXPO_PUBLIC_GROQ_API_KEY)');
    return getFallbackResponse(userMessage, userContext);
  }

  try {
    // Build messages array for Groq (OpenAI-compatible format)
    const messages = [
      {
        role: 'system',
        content: getSystemPrompt(userContext)
      },
      // Previous conversation history
      ...conversationHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      // Current user message
      {
        role: 'user',
        content: userMessage
      }
    ];

    console.log('Calling Groq API...');

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Groq API error:', errorData);
      return getFallbackResponse(userMessage, userContext);
    }

    const data = await response.json();
    console.log('Groq API success!');

    // Extract the response text
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      console.error('No response from Groq:', data);
      return getFallbackResponse(userMessage, userContext);
    }

    return aiResponse;
  } catch (error) {
    console.error('Error calling Groq API:', error);
    return getFallbackResponse(userMessage, userContext);
  }
};

/**
 * Fallback response when AI is unavailable
 */
const getFallbackResponse = (userMessage: string, context: UserContext): string => {
  const isSpanish = context.language === 'es';
  const lowerMessage = userMessage.toLowerCase();

  // Check for emergency keywords
  if (/emergency|crisis|danger|suicide|hurt|abuse|emergencia|peligro|suicidio|abuso/i.test(lowerMessage)) {
    return isSpanish
      ? 'Si estás en peligro inmediato, llama al 911. Para crisis de salud mental, llama al 988. Para violencia doméstica: 1-800-799-7233. Estamos aquí para ayudarte.'
      : 'If you\'re in immediate danger, call 911. For mental health crisis, call 988. For domestic violence: 1-800-799-7233. We\'re here to help.';
  }

  // Check for shelter keywords
  if (/shelter|sleep|bed|homeless|refugio|dormir|cama/i.test(lowerMessage)) {
    return isSpanish
      ? 'Para encontrar refugio cerca de ti, marca 211 y presiona 6 para servicios de personas sin hogar, o visita la sección de Vivienda en esta app.'
      : 'To find shelter near you, dial 211 and press 6 for homeless services, or visit the Housing section in this app.';
  }

  // Check for job keywords
  if (/job|work|employ|trabajo|empleo/i.test(lowerMessage)) {
    return isSpanish
      ? 'Para ayuda con empleo, visita la sección de Empleo en esta app. También puedes llamar al 211 para servicios de capacitación laboral en tu área.'
      : 'For employment help, check the Jobs section in this app. You can also call 211 for job training services in your area.';
  }

  // Check for health keywords
  if (/doctor|clinic|health|sick|medicine|médico|clínica|salud|enfermo/i.test(lowerMessage)) {
    return isSpanish
      ? 'Para atención médica gratuita o de bajo costo, visita la sección de Salud en esta app o llama al 211 para clínicas comunitarias cerca de ti.'
      : 'For free or low-cost healthcare, check the Health section in this app or call 211 for community clinics near you.';
  }

  // Default response
  return isSpanish
    ? 'Estoy aquí para ayudarte a encontrar recursos. Puedo ayudarte con refugio, empleo, salud y más. ¿Qué necesitas? También puedes llamar al 211 para recursos comunitarios.'
    : 'I\'m here to help you find resources. I can help with shelter, jobs, healthcare, and more. What do you need? You can also call 211 for community resources.';
};

/**
 * Check if the AI service is available
 */
export const isAIAvailable = (): boolean => {
  return !!getApiKey();
};
