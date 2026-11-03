// src/components/algos/AlgoTrainerQuizModal.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Cross, Check, ChevronRight, Play, Sparkles } from '@getpapillon/papicons';
import { CubeDiagram2D } from './CubeDiagram2D';

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function AlgoTrainerQuizModal({
  isOpen,
  onClose,
  cases = [],
  size = 3,
  categoryName = '',
  onTestAlgo
}) {
  const { t } = useTranslation();

  const [deck, setDeck] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [options, setOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null); // name picked by user
  const [hasAnswered, setHasAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [recognitionTime, setRecognitionTime] = useState(null);
  const [isFinished, setIsFinished] = useState(false);
  const [solveTimes, setSolveTimes] = useState([]);

  const startTimeRef = useRef(null);

  // Filtrer les cas valides (avec nom et algorithme)
  const validCases = useMemo(() => {
    return cases.filter(c => c && c.name && c.alg);
  }, [cases]);

  const currentCase = deck[currentIndex] || null;
  const isLastQuestion = currentIndex + 1 >= deck.length;

  // Préparer les 4 options pour le cas cible
  const prepareQuestion = useCallback((targetCase, allCases) => {
    if (!targetCase) return;

    setSelectedOption(null);
    setHasAnswered(false);
    setRecognitionTime(null);
    startTimeRef.current = performance.now();

    // Générer 4 options uniques (1 bonne + 3 distracteurs)
    const otherCases = allCases.filter(c => c.name !== targetCase.name);
    const shuffledOthers = shuffleArray(otherCases);
    const distractors = shuffledOthers.slice(0, 3).map(c => c.name);

    const allOptions = shuffleArray([targetCase.name, ...distractors]);
    setOptions(allOptions);
  }, []);

  // Lancer ou recommencer le quiz : mélange complet pour passer chaque cas exactement 1 fois
  const startQuiz = useCallback(() => {
    if (!validCases || validCases.length === 0) return;

    const shuffled = shuffleArray(validCases);
    setDeck(shuffled);
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setIsFinished(false);
    setSolveTimes([]);

    prepareQuestion(shuffled[0], validCases);
  }, [validCases, prepareQuestion]);

  // Initialisation à l'ouverture de la modale
  useEffect(() => {
    if (isOpen) {
      startQuiz();
    }
  }, [isOpen, startQuiz]);

  // Passer à la question suivante (ou terminer si c'était la dernière)
  const handleNext = useCallback(() => {
    if (!hasAnswered) return;

    const nextIndex = currentIndex + 1;
    if (nextIndex < deck.length) {
      setCurrentIndex(nextIndex);
      prepareQuestion(deck[nextIndex], validCases);
    } else {
      setIsFinished(true);
    }
  }, [hasAnswered, currentIndex, deck, validCases, prepareQuestion]);

  // Validation d'une réponse
  const handleSelectOption = useCallback(
    chosenName => {
      if (hasAnswered || !currentCase) return;

      const elapsed = Math.round(performance.now() - startTimeRef.current);
      const elapsedSec = (elapsed / 1000).toFixed(2);
      setRecognitionTime(elapsedSec);
      setSolveTimes(prev => [...prev, Number(elapsedSec)]);
      setSelectedOption(chosenName);
      setHasAnswered(true);

      const isCorrect = chosenName === currentCase.name;
      if (isCorrect) {
        setScore(prev => prev + 1);
        setStreak(prev => {
          const next = prev + 1;
          setMaxStreak(m => Math.max(m, next));
          return next;
        });
      } else {
        setStreak(0);
      }
    },
    [hasAnswered, currentCase]
  );

  // Gestion des touches clavier (1, 2, 3, 4 pour répondre, Espace/Entrée pour suivant ou recommencer)
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = e => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (isFinished) {
        if (e.code === 'Space' || e.key === 'Enter') {
          e.preventDefault();
          startQuiz();
        }
        return;
      }

      if (!hasAnswered) {
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= options.length) {
          e.preventDefault();
          handleSelectOption(options[num - 1]);
        }
      } else {
        if (e.code === 'Space' || e.key === 'Enter') {
          e.preventDefault();
          handleNext();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, isFinished, hasAnswered, options, handleSelectOption, handleNext, startQuiz, onClose]);

  if (!isOpen) return null;

  const totalDeck = deck.length;
  const accuracy = totalDeck > 0 ? Math.round((score / totalDeck) * 100) : 0;
  const avgTime =
    solveTimes.length > 0
      ? (solveTimes.reduce((a, b) => a + b, 0) / solveTimes.length).toFixed(2)
      : '-';

  return (
    <div className="algo-modal-backdrop" onClick={onClose}>
      <div className="algo-quiz-modal-content" onClick={e => e.stopPropagation()}>
        {/* En-tête */}
        <div className="algo-quiz-modal-header">
          <div className="algo-quiz-header-info">
            <span className="algo-quiz-badge">⚡ {t('quiz.modeTitle', { defaultValue: 'Quiz' })}</span>
            <h3 className="algo-quiz-title">
              {categoryName ? `${categoryName}` : t('quiz.title', { defaultValue: 'Reconnaissance' })}
            </h3>
          </div>
          <button className="algo-modal-close-btn" onClick={onClose} title={t('common.close')}>
            <Cross size={18} />
          </button>
        </div>

        {/* Vue 1 : Quiz terminé (Bilan final) */}
        {isFinished ? (
          <div className="algo-quiz-finished-box">
            <div className="algo-quiz-finished-icon">
              <Sparkles size={32} />
            </div>
            <h3 className="algo-quiz-finished-title">
              {t('quiz.finishedTitle', { defaultValue: 'Quiz terminé !' })}
            </h3>
            <p className="algo-quiz-finished-sub">
              {t('quiz.finishedSubtitle', {
                defaultValue: 'Vous avez passé en revue tous les cas de cette série sans répétition.'
              })}
            </p>

            <div className="algo-quiz-finished-grid">
              <div className="algo-quiz-finished-stat">
                <span className="stat-label">{t('quiz.score', { defaultValue: 'Score' })}</span>
                <span className="stat-val">
                  {score} / {totalDeck}
                </span>
              </div>
              <div className="algo-quiz-finished-stat">
                <span className="stat-label">{t('quiz.accuracy', { defaultValue: 'Précision' })}</span>
                <span className="stat-val accent">{accuracy}%</span>
              </div>
              <div className="algo-quiz-finished-stat">
                <span className="stat-label">{t('quiz.bestStreak', { defaultValue: 'Meilleure série' })}</span>
                <span className="stat-val streak">🔥 {maxStreak}</span>
              </div>
              <div className="algo-quiz-finished-stat">
                <span className="stat-label">{t('quiz.avgTime', { defaultValue: 'Temps moyen' })}</span>
                <span className="stat-val time">{avgTime}s</span>
              </div>
            </div>

            <div className="algo-quiz-finished-actions">
              <button className="algo-quiz-secondary-btn" onClick={onClose}>
                <span>{t('common.close', { defaultValue: 'Fermer' })}</span>
              </button>
              <button className="algo-quiz-primary-btn" onClick={startQuiz}>
                <span>{t('quiz.restart', { defaultValue: 'Recommencer le quiz' })}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Vue 2 : Question en cours */
          <>
            {/* Barre de stats (Progression, Score, Série, Temps) */}
            <div className="algo-quiz-stats-bar">
              <div className="algo-quiz-stat-item">
                <span className="stat-label">
                  {t('quiz.progress', { current: currentIndex + 1, total: totalDeck || 1 })}
                </span>
              </div>
              <div className="algo-quiz-stat-item">
                <span className="stat-label">{t('quiz.score', { defaultValue: 'Score' })}</span>
                <span className="stat-value">
                  {score} / {currentIndex + (hasAnswered ? 1 : 0)}
                </span>
              </div>
              <div className="algo-quiz-stat-item">
                <span className="stat-label">{t('quiz.streak', { defaultValue: 'Série' })}</span>
                <span className="stat-value streak">🔥 {streak}</span>
              </div>
              {recognitionTime !== null && (
                <div className="algo-quiz-stat-item">
                  <span className="stat-label">{t('quiz.time', { defaultValue: 'Temps' })}</span>
                  <span className="stat-value time">{recognitionTime}s</span>
                </div>
              )}
            </div>

            {/* Corps central : Diagramme 2D masqué */}
            <div className="algo-quiz-diagram-box">
              {currentCase && (
                <CubeDiagram2D
                  size={size}
                  alg={currentCase.alg}
                  setup={currentCase.setup}
                  yellowTop={currentCase.yellowTop}
                  maskMode={currentCase.maskMode}
                  view={currentCase.view}
                  arrows={currentCase.arrows}
                  width={160}
                  height={160}
                />
              )}

              {/* Révélation de la formule si répondu */}
              {hasAnswered && currentCase && (
                <div className="algo-quiz-reveal-box">
                  <div className="algo-quiz-reveal-name">{currentCase.name}</div>
                  <div className="algo-quiz-reveal-formula">{currentCase.alg}</div>
                </div>
              )}
            </div>

            {/* Grille des 4 choix multiples */}
            <div className="algo-quiz-options-grid">
              {options.map((optName, idx) => {
                let btnClass = 'algo-quiz-option-btn';
                if (hasAnswered) {
                  if (optName === currentCase?.name) {
                    btnClass += ' correct';
                  } else if (optName === selectedOption) {
                    btnClass += ' wrong';
                  } else {
                    btnClass += ' disabled';
                  }
                }

                return (
                  <button
                    key={optName}
                    className={btnClass}
                    onClick={() => handleSelectOption(optName)}
                    disabled={hasAnswered}
                  >
                    <span className="option-key-pill">{idx + 1}</span>
                    <span className="option-name">{optName}</span>
                    {hasAnswered && optName === currentCase?.name && (
                      <Check size={16} className="option-check-icon" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Pied de page : Cas suivant ou Bilan final / Tester sur le cube */}
            {hasAnswered && (
              <div className="algo-quiz-footer">
                {onTestAlgo && currentCase && (
                  <button
                    className="algo-quiz-secondary-btn"
                    onClick={() => {
                      onClose();
                      onTestAlgo({ ...currentCase, size });
                    }}
                  >
                    <Play size={16} />
                    <span>{t('quiz.testOnCube', { defaultValue: 'Tester en 3D' })}</span>
                  </button>
                )}
                <button className="algo-quiz-primary-btn" onClick={handleNext}>
                  <span>
                    {isLastQuestion
                      ? t('quiz.seeResults', { defaultValue: 'Voir le bilan' })
                      : t('quiz.nextCase', { defaultValue: 'Cas suivant' })}
                  </span>
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
