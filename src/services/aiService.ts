/**
 * AI Service - Google Gemini Integration
 * Provides intelligent conversational AI for the Case Manager
 */

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent';

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
}

/**
 * System prompt that defines the AI Case Manager's behavior
 */
const getSystemPrompt = (context: UserContext): string => {
  const isSpanish = context.language === 'es';

  return isSpanish ? `Eres un asistente de caso compasivo y conocedor que ayuda a personas sin hogar o en riesgo de quedarse sin hogar a encontrar recursos. Tu nombre es "Asistente ConnectCare".

DIRECTRICES IMPORTANTES:
- Sé cálido, empático y sin prejuicios
- Da respuestas concisas y prácticas (2-3 oraciones máximo)
- Siempre proporciona pasos de acción específicos
- Incluye números de teléfono cuando sea posible
- Prioriza recursos gratuitos y de bajo costo
- Si alguien está en crisis, dirige a líneas de emergencia inmediatamente

NÚMEROS IMPORTANTES:
- Emergencias: 911
- Línea de Crisis/Suicidio: 988
- Recursos Comunitarios: 211
- Violencia Doméstica: 1-800-799-7233
- Línea Nacional para Personas sin Hogar: 1-800-231-6946

INFORMACIÓN DEL USUARIO:
- Nombre: ${context.name || 'No proporcionado'}
- Ubicación: ${context.city ? `${context.city}, ${context.state}` : 'No proporcionada'}

Responde siempre en español. Sé breve pero útil.`

  : `You are a compassionate, knowledgeable case manager assistant helping people who are homeless or at risk of homelessness find resources. Your name is "ConnectCare Assistant".

IMPORTANT GUIDELINES:
- Be warm, empathetic, and non-judgmental
- Give concise, actionable responses (2-3 sentences max)
- Always provide specific action steps
- Include phone numbers when possible
- Prioritize free and low-cost resources
- If someone is in crisis, direct to emergency lines immediately

IMPORTANT NUMBERS:
- Emergency: 911
- Crisis/Suicide Lifeline: 988
- Community Resources: 211
- Domestic Violence: 1-800-799-7233
- National Homeless Hotline: 1-800-231-6946

USER INFORMATION:
- Name: ${context.name || 'Not provided'}
- Location: ${context.city ? `${context.city}, ${context.state}` : 'Not provided'}

Always respond in English. Be brief but helpful.`;
};

/**
 * Send a message to the Gemini AI and get a response
 */
export const sendMessageToAI = async (
  userMessage: string,
  conversationHistory: AIMessage[],
  userContext: UserContext
): Promise<string> => {
  if (!GEMINI_API_KEY) {
    console.warn('Gemini API key not configured');
    return getFallbackResponse(userMessage, userContext);
  }

  try {
    // Build conversation contents for Gemini
    const contents = [
      // System instruction as first user message
      {
        role: 'user',
        parts: [{ text: getSystemPrompt(userContext) }]
      },
      {
        role: 'model',
        parts: [{ text: userContext.language === 'es'
          ? 'Entendido. Soy el Asistente ConnectCare y estoy aquí para ayudarte a encontrar recursos. ¿En qué puedo ayudarte hoy?'
          : 'Understood. I am the ConnectCare Assistant and I\'m here to help you find resources. How can I help you today?' }]
      },
      // Previous conversation history
      ...conversationHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      })),
      // Current user message
      {
        role: 'user',
        parts: [{ text: userMessage }]
      }
    ];

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 500,
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          }
        ]
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gemini API error:', errorData);
      return getFallbackResponse(userMessage, userContext);
    }

    const data = await response.json();

    // Extract the response text
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiResponse) {
      console.error('No response from Gemini:', data);
      return getFallbackResponse(userMessage, userContext);
    }

    return aiResponse;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
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
      ? 'Para encontrar refugio cerca de ti, llama al 211 o visita la sección de Vivienda en esta app. La Línea Nacional para Personas sin Hogar es 1-800-231-6946.'
      : 'To find shelter near you, call 211 or visit the Housing section in this app. The National Homeless Hotline is 1-800-231-6946.';
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
  return !!GEMINI_API_KEY;
};
