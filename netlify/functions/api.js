// [Keep your CORPORA object and MLLM class from Option 2 up here]

let models = null;

async function initializeModels() {
  if (models) return; // Use cached models if the function is warm
  
  models = {
    mllm3: new MLLM(50),
    mllm3flash: new MLLM(50),
    mllm3micro: new MLLM(50),
    mllm3max: new MLLM(50)
  };

  await Promise.all(Object.keys(models).map(async (key) => {
    if (CORPORA[key] && CORPORA[key].length > 10) {
      await models[key].train(CORPORA[key]);
    }
  }));
}

exports.handler = async (event, context) => {
  // Allow GET requests so we can use URL parameters
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed. Please use a GET request.' };
  }

  try {
    // Netlify automatically decodes URL parameters and places them here
    const params = event.queryStringParameters || {};
    
    // Extract parameters with fallbacks
    const model = params.model || 'mllm3';
    const prompt = params.prompt || '';
    const maxTokens = parseInt(params.maxTokens) || 30;
    const temperature = parseFloat(params.temperature) || 0.8;

    if (!prompt) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Please provide a prompt parameter in the URL.' }) };
    }

    // Train the models if it's a cold start
    await initializeModels();

    if (!models[model]) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: 'Invalid model. Use mllm3, mllm3flash, mllm3micro, or mllm3max.' }) 
      };
    }

    if (!models[model].trained) {
       return { 
         statusCode: 500, 
         body: JSON.stringify({ error: `Model ${model} not trained. Ensure the corpus is populated.` }) 
       };
    }

    // Generate the response
    const responseText = models[model].generateResponse(prompt, maxTokens, temperature);

    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        // Optional: add CORS headers if you want to call this from other web domains
        'Access-Control-Allow-Origin': '*' 
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        response: responseText,
        tokens_generated: responseText.split(' ').length
      })
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
