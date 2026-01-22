
import React, { useState } from 'react';
import { AppState, UserInput, AnalysisResult, QuickNeeds } from './types';
import { analyzeUserNeeds } from './services/geminiService';
import LifestyleInput from './components/LifestyleInput';
import PlanResults from './components/PlanRecommendation';
import QuickNeedsSelector from './components/QuickNeedsSelector';
import { Activity, Radio, Wifi, Zap } from 'lucide-react';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.WELCOME);
  const [userInput, setUserInput] = useState<UserInput | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleStart = () => {
    setAppState(AppState.INPUT);
    setErrorMsg(null);
  };

  const handleInitialInput = (input: UserInput) => {
    setUserInput(input);
    if (input.lifestyleId === 'other') {
      setAppState(AppState.QUICK_QUESTIONS);
    } else {
      handleAnalysis(input);
    }
  };

  const handleQuickNeeds = (needs: QuickNeeds) => {
    if (!userInput) return;

    const newPriorities = [...(userInput.priority || [])];
    
    if (needs.dataUsage === 'High' || needs.dataUsage === 'Unlimited') {
        newPriorities.push('I hate running out of data');
    }
    if (needs.dataUsage === 'Unlimited') {
        newPriorities.push('I want unlimited so I never think about it');
    }
    if (needs.dataUsage === 'Low') {
        newPriorities.push('I barely use data');
    }

    if (needs.euTravel === 'Often') {
        newPriorities.push('I travel in Europe often');
    }

    if (needs.priority === 'Flexibility') {
        newPriorities.push('I want no contract commitment');
    }
    if (needs.priority === 'Savings') {
        newPriorities.push('I want something cheap and simple');
    }

    const updatedInput = {
      ...userInput,
      priority: Array.from(new Set(newPriorities)),
      quickNeeds: needs,
      lifestyleId: undefined
    };

    setUserInput(updatedInput);
    handleAnalysis(updatedInput);
  };

  const handleAnalysis = async (input: UserInput) => {
    setAppState(AppState.ANALYZING);
    setErrorMsg(null);
    try {
      const result = await analyzeUserNeeds(input);
      setAnalysisResult(result);
      setAppState(AppState.RESULTS);
    } catch (error) {
      console.error(error);
      setErrorMsg("We encountered a brief connection issue. Please verify your settings and try again.");
      setAppState(AppState.INPUT);
    }
  };

  const handleReset = () => {
    setAnalysisResult(null);
    setUserInput(null);
    setAppState(AppState.WELCOME);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans selection:bg-brand-orange selection:text-white">
      <header className="bg-white/90 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer group" onClick={handleReset}>
             <div className="w-9 h-9 bg-brand-orange text-white rounded-full flex items-center justify-center text-lg shadow-sm group-hover:scale-105 transition-transform duration-200">
                🐧
             </div>
             <span className="text-xl font-bold tracking-tight text-gray-900 group-hover:text-brand-orange transition-colors">Puffin</span>
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
             UK SIM Advisor (MVP)
          </div>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
        {errorMsg && (
            <div className="mb-8 p-4 bg-red-50 text-red-700 rounded-2xl border border-red-100 max-w-lg w-full text-center shadow-sm">
                {errorMsg}
            </div>
        )}

        {appState === AppState.WELCOME && (
          <div className="text-center max-w-3xl space-y-8 animate-fade-in-up py-10">
             <div className="relative inline-block mb-4">
                <div className="absolute inset-0 bg-brand-orange/20 blur-3xl rounded-full"></div>
                <div className="relative w-28 h-28 bg-white rounded-[2rem] shadow-xl shadow-orange-100 flex items-center justify-center mx-auto transform rotate-3 hover:rotate-0 transition-transform duration-500 border border-gray-50">
                    <span className="text-7xl">🐧</span>
                </div>
             </div>
             <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 tracking-tight leading-[1.1] drop-shadow-sm">
               Mobile plans, <br/>
               <span className="text-brand-orange">curated for real life.</span>
             </h1>
             <p className="text-xl md:text-2xl text-gray-500 max-w-2xl mx-auto leading-relaxed font-light">
               Puffin analyses your usage and travel habits to suggest the closest matches from the UK SIM-only market.
             </p>
             <div className="flex flex-col sm:flex-row items-center justify-center gap-5 pt-8">
                <button 
                  onClick={handleStart}
                  className="px-10 py-4 bg-gray-900 text-white rounded-full font-bold text-lg hover:bg-gray-800 transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
                >
                  Start My Analysis
                </button>
             </div>
          </div>
        )}

        {appState === AppState.INPUT && (
          <div className="w-full animate-fade-in-up">
            <LifestyleInput onSubmit={handleInitialInput} isLoading={false} />
          </div>
        )}

        {appState === AppState.QUICK_QUESTIONS && (
          <div className="w-full animate-fade-in-up">
            <QuickNeedsSelector onSubmit={handleQuickNeeds} />
          </div>
        )}

        {appState === AppState.ANALYZING && (
          <div className="text-center space-y-6 animate-pulse py-20">
            <div className="w-24 h-24 bg-gradient-to-tr from-brand-orange to-yellow-400 rounded-full mx-auto flex items-center justify-center shadow-xl shadow-orange-200">
                <Activity className="w-10 h-10 text-white animate-spin" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Analysing market options...</h2>
          </div>
        )}

        {appState === AppState.RESULTS && analysisResult && userInput && (
          <PlanResults 
            analysis={analysisResult}
            userInput={userInput}
            onReset={handleReset}
          />
        )}
      </main>

      <footer className="py-8 text-center text-gray-400 text-sm border-t border-gray-100 bg-white/50 mt-auto">
        <p>© 2024 Puffin. Independent UK mobile advice.</p>
      </footer>
    </div>
  );
};

export default App;
