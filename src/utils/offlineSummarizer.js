/**
 * Fallback Summarizer using Term Frequency (TF-IDF inspired) logic.
 * Used when the Groq API is unavailable or unconfigured, ensuring the app never fully breaks.
 */
export const generateOfflineSummary = (text, length = 'short') => {
  // 1. Clean and split text into sentences
  // A simple regex to split by periods, exclamation marks, or question marks.
  const sentenceRegex = /[^.!?]+[.!?]+/g;
  const sentences = text.match(sentenceRegex) || [text];
  
  if (sentences.length <= 1) {
    return {
      summary: text,
      keyPoints: ["Document is too short for key points extraction."]
    };
  }

  // 2. Tokenize and calculate word frequencies (ignore basic stop words for better quality)
  const stopWords = new Set(['the', 'is', 'in', 'at', 'of', 'on', 'and', 'a', 'to', 'for', 'with', 'it', 'as', 'by', 'this', 'that', 'an']);
  const wordFrequencies = {};
  
  sentences.forEach(sentence => {
    const words = sentence.toLowerCase().match(/\b\w+\b/g) || [];
    words.forEach(word => {
      if (!stopWords.has(word) && word.length > 2) {
        wordFrequencies[word] = (wordFrequencies[word] || 0) + 1;
      }
    });
  });

  // 3. Score sentences based on term frequencies
  // Higher score = more "important" words in the sentence.
  const sentenceScores = sentences.map((sentence, index) => {
    const words = sentence.toLowerCase().match(/\b\w+\b/g) || [];
    let score = 0;
    words.forEach(word => {
      if (wordFrequencies[word]) {
        score += wordFrequencies[word];
      }
    });
    // Normalize score by sentence length to not blindly favor long sentences
    score = words.length > 0 ? score / words.length : 0;
    return { sentence: sentence.trim(), score, index };
  });

  // 4. Sort sentences by score descending
  const sortedSentences = [...sentenceScores].sort((a, b) => b.score - a.score);

  // 5. Determine how many sentences to pick based on requested length
  let numSentencesToPick = 2;
  if (length === 'short') numSentencesToPick = 2;
  if (length === 'medium') numSentencesToPick = Math.max(3, Math.min(5, Math.ceil(sentences.length * 0.3)));
  if (length === 'long') numSentencesToPick = Math.max(5, Math.min(10, Math.ceil(sentences.length * 0.5)));
  
  numSentencesToPick = Math.min(numSentencesToPick, sentences.length);

  // 6. Select top sentences and restore their original chronological order for readability
  const selectedSentences = sortedSentences
    .slice(0, numSentencesToPick)
    .sort((a, b) => a.index - b.index)
    .map(s => s.sentence);

  // 7. Format the output to match the LLM JSON structure expected by the frontend
  // Chunk sentences into paragraphs for better readability (2 sentences per paragraph approx)
  const summaryParagraphs = [];
  for (let i = 0; i < selectedSentences.length; i += 2) {
    summaryParagraphs.push(selectedSentences.slice(i, i + 2).join(' '));
  }
  
  // Use the top 3 absolute highest scoring sentences as key points
  const keyPoints = sortedSentences
    .slice(0, Math.min(3, sortedSentences.length))
    .map(s => {
      const words = s.sentence.split(' ');
      const title = words.slice(0, Math.min(6, words.length)).join(' ') + '...';
      return {
        title,
        details: s.sentence
      };
    });

  return {
    summaryParagraphs,
    keyPoints
  };
};
