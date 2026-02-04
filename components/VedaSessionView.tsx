
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DoctorProfile, TranscriptEntry } from '../types';
import { Icon } from './Icon';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { processAudioSegment, generateClinicalNote } from '../services/geminiService';
import { renderMarkdownToHTML } from '../utils/markdownRenderer';

interface ScribeSessionViewProps {
    onEndSession: () => void;
    doctorProfile: DoctorProfile;
    language: string;
}

interface PatientDemographics {
    name: string; age: string; sex: string; mobile: string; weight: string; height: string; bmi: string;
    date: string; hospitalName: string; hospitalAddress: string; hospitalPhone: string;
}

// --- Helper Components ---

const AudioWaveform: React.FC<{ active: boolean }> = ({ active }) => {
    if (!active) return <div className="h-12 w-full flex items-center justify-center text-gray-500 font-mono text-xs">MICROPHONE OFF</div>;
    
    return (
        <div className="flex items-center justify-center gap-1.5 h-16 px-4">
            {[...Array(12)].map((_, i) => (
                <div
                    key={i}
                    className="w-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                    style={{
                        height: `${30 + Math.random() * 70}%`,
                        animationDuration: `${0.4 + Math.random() * 0.3}s`,
                        animationDelay: `${i * 0.05}s`
                    }}
                ></div>
            ))}
        </div>
    );
};

const stripMarkdown = (text: string): string => {
    if (!text) return "";
    return text.replace(/^[#\s*+-]+/gm, '').replace(/[*_]{1,2}/g, '').trim();
};

const PrescriptionTemplate: React.FC<{ patient: PatientDemographics; clinicalNote: string; isPreview?: boolean }> = ({ patient, clinicalNote, isPreview }) => {
    const getSectionContent = (title: string) => {
        if (!clinicalNote) return "";
        const regex = new RegExp(`##\\s*${title}[^]*?(?=##|$)`, 'i');
        const match = clinicalNote.match(regex);
        if (!match) return "";
        return stripMarkdown(match[0].replace(new RegExp(`##\\s*${title}`, 'i'), '').trim());
    };

    const containerClass = isPreview
        ? "w-full bg-white text-black p-6 rounded-lg shadow-inner overflow-hidden border border-gray-200"
        : "printable-area p-8 bg-white text-black relative";

    const baseFontSize = isPreview ? 'text-[10px]' : 'text-[12.5px]';
    const headerTitleSize = isPreview ? 'text-[15px]' : 'text-[22px]';
    const metaLabelSize = isPreview ? 'text-[9.5px]' : 'text-[12.5px]';

    const planLines = getSectionContent('Plan').split('\n').map(l => l.trim()).filter(Boolean);
    const medicines = planLines.filter(l => l.includes('|')).map(line => {
        const parts = line.split('|').map(p => p.trim());
        return {
            name: parts[0] || '',
            dosage: parts[1] || '-',
            frequency: parts[2] || '-',
            route: parts[3] || '-'
        };
    });
    const adviceLines = planLines.filter(l => !l.includes('|'));

    return (
        <div className={containerClass} style={{ fontFamily: 'Arial, Helvetica, "Noto Sans Devanagari", sans-serif' }}>
            {/* Header Branding */}
            <div className="flex justify-between items-start mb-1" style={{ breakInside: 'avoid' }}>
                <div className="flex-1">
                    <div className={`${headerTitleSize} font-bold leading-tight uppercase`}>Doctors Name</div>
                    <div className={`${isPreview ? 'text-[8.5px]' : 'text-[11.5px]'} font-normal mt-0.5`}>Qualification</div>
                    <div className={`${isPreview ? 'text-[8.5px]' : 'text-[11.5px]'} font-normal`}>Reg. No :</div>
                </div>
                <div className="flex-1 text-right">
                    <div className={`${headerTitleSize} font-bold leading-tight uppercase`}>{patient.hospitalName}</div>
                    <div className={`${isPreview ? 'text-[8.5px]' : 'text-[11.5px]'} font-normal mt-0.5`}>{patient.hospitalAddress}</div>
                    <div className={`flex justify-end ${isPreview ? 'gap-4' : 'gap-10'} mt-1 ${isPreview ? 'text-[8.5px]' : 'text-[11.5px]'}`}>
                        <div><span className="font-bold">Ph:</span> {patient.hospitalPhone}</div>
                        <div><span className="font-bold">Time:</span> {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</div>
                    </div>
                </div>
            </div>

            <div className="h-0.5 bg-[#8A63D2] w-full mb-5"></div>

            {/* Demographics Grid */}
            <div className="grid grid-cols-2 border border-gray-300 mb-5 relative" style={{ breakInside: 'avoid' }}>
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-300"></div>
                <div className={`${metaLabelSize} space-y-3.5 p-3.5`}>
                    <div className="font-bold">Name/ID - <span className="font-normal ml-1">{patient.name}</span></div>
                    <div className="font-bold">Age - <span className="font-normal ml-1">{patient.age}</span></div>
                    <div className="flex justify-between max-w-[95%]">
                        <div className="font-bold">Sex - <span className="font-normal ml-1">{patient.sex}</span></div>
                        <div className="font-bold">Mob. No. - <span className="font-normal ml-1">{patient.mobile}</span></div>
                    </div>
                </div>
                <div className={`${metaLabelSize} p-3.5 space-y-3.5`}>
                    <div className="font-bold">Date: <span className="font-normal ml-1">{patient.date}</span></div>
                    <div className="font-bold">Weight - <span className="font-normal ml-1">{patient.weight}</span></div>
                    <div className="flex justify-between">
                        <div className="font-bold">Height - <span className="font-normal ml-1">{patient.height}</span></div>
                        <div className="font-bold">B.M.I. - <span className="font-normal ml-1">{patient.bmi}</span></div>
                    </div>
                </div>
            </div>

            {/* Side-by-Side: Chief Complaints & Clinical Findings */}
            <div className="grid grid-cols-2 border-l border-r border-t border-gray-300 bg-[#F0F7FF]">
                <div className={`${baseFontSize} p-2 font-bold border-r border-gray-300 uppercase tracking-tighter`}>Chief Complaint</div>
                <div className={`${baseFontSize} p-2 font-bold uppercase tracking-tighter`}>Clinical Findings</div>
            </div>
            <div className={`grid grid-cols-2 border border-gray-300 mb-5`}>
                <div className={`${baseFontSize} p-4 border-r border-gray-300 whitespace-pre-wrap leading-relaxed min-h-[140px] font-normal`}>
                    {getSectionContent('Subjective')}
                </div>
                <div className={`${baseFontSize} p-4 whitespace-pre-wrap leading-relaxed min-h-[140px] font-normal`}>
                    {getSectionContent('Objective')}
                </div>
            </div>

            {/* Diagnosis (Full Width) */}
            <div className="bg-[#FFF0F0] border-l border-r border-t border-gray-300 p-2">
                <div className={`${baseFontSize} font-bold uppercase tracking-tighter`}>Diagnosis</div>
            </div>
            <div className={`border border-gray-300 mb-5 p-4 ${baseFontSize} whitespace-pre-wrap min-h-[60px] font-normal leading-relaxed`}>
                {getSectionContent('Assessment')}
            </div>

            {/* Differential Diagnosis (Full Width) */}
            <div className="bg-[#FFF0F0] border-l border-r border-t border-gray-300 p-2">
                <div className={`${baseFontSize} font-bold uppercase tracking-tighter`}>Differential Diagnosis</div>
            </div>
            <div className={`border border-gray-300 mb-5 p-4 ${baseFontSize} whitespace-pre-wrap min-h-[60px] font-normal leading-relaxed`}>
                {getSectionContent('Differential Diagnosis') || "None identified."}
            </div>

            {/* Lab Test Results (Full Width) */}
            <div className="bg-[#FAF5FF] border-l border-r border-t border-gray-300 p-2">
                <div className={`${baseFontSize} font-bold uppercase tracking-tighter`}>Lab Test Results</div>
            </div>
            <div className={`border border-gray-300 mb-5 p-4 ${baseFontSize} whitespace-pre-wrap min-h-[60px] font-normal leading-relaxed`}>
                {getSectionContent('Lab Results') || "No lab results recorded."}
            </div>

            {/* Medicine Table */}
            <div className="mb-5">
                <div className="grid grid-cols-4 bg-[#D1F7E2] border border-gray-300 font-bold uppercase tracking-tighter">
                    <div className={`${baseFontSize} p-2 border-r border-gray-300`}>Name</div>
                    <div className={`${baseFontSize} p-2 border-r border-gray-300 text-center`}>Dosage</div>
                    <div className={`${baseFontSize} p-2 border-r border-gray-300 text-center`}>Frequency</div>
                    <div className={`${baseFontSize} p-2 text-center`}>Route</div>
                </div>
                <div className="border-l border-r border-b border-gray-300 min-h-[140px]">
                    {medicines.map((med, i) => (
                        <div key={i} className="grid grid-cols-4 border-b border-gray-200 last:border-0 font-normal">
                            <div className={`${baseFontSize} p-3 border-r border-gray-200`}>{med.name}</div>
                            <div className={`${baseFontSize} p-3 border-r border-gray-200 text-center`}>{med.dosage}</div>
                            <div className={`${baseFontSize} p-3 border-r border-gray-200 text-center`}>{med.frequency}</div>
                            <div className={`${baseFontSize} p-3 text-center`}>{med.route}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Advice (Full Width) */}
            <div className="flex flex-col flex-grow">
                <div className="bg-[#FEF9C3] border border-gray-300 p-2">
                    <div className={`${baseFontSize} font-bold uppercase tracking-tighter`}>Advice / Instructions</div>
                </div>
                <div className={`border-l border-r border-b border-gray-300 p-4 h-full ${baseFontSize} whitespace-pre-wrap leading-relaxed font-normal`}>
                    {adviceLines.join('\n') || "N/A"}
                </div>
            </div>

            {/* Signature Area */}
            <div className="flex justify-end items-end pt-14" style={{ breakInside: 'avoid' }}>
                <div className="text-center">
                    <div className={`border-t border-black ${isPreview ? 'w-32' : 'w-60'} pt-2 font-bold ${baseFontSize} uppercase`}>Doctors Signature</div>
                </div>
            </div>
        </div>
    );
};

// --- Main Component ---

export const ScribeSessionView: React.FC<ScribeSessionViewProps> = ({ onEndSession, doctorProfile, language: defaultLanguage }) => {
    const [phase, setPhase] = useState<'consent' | 'active' | 'processing' | 'review'>('consent');
    const [sessionLanguage, setSessionLanguage] = useState("Auto-detect");
    const [transcriptHistory, setTranscriptHistory] = useState<TranscriptEntry[]>([]);
    const [clinicalNote, setClinicalNote] = useState('');
    const [isEditingNote, setIsEditingNote] = useState(false);
    const [isGeneratingNote, setIsGeneratingNote] = useState(false);
    const [duration, setDuration] = useState(0);
    const [showPdfPreview, setShowPdfPreview] = useState(true);

    const [patient, setPatient] = useState<PatientDemographics>({
        name: '', age: '', sex: '', mobile: '', weight: '', height: '', bmi: '',
        date: new Date().toLocaleDateString('en-GB'),
        hospitalName: 'OPD PLATFORM CLINIC',
        hospitalAddress: 'Mumbai, India',
        hospitalPhone: ''
    });

    const processedSegmentsRef = useRef<number>(0);
    const pendingSegmentsQueue = useRef<Blob[]>([]);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const transcriptEndRef = useRef<HTMLDivElement>(null);

    const { isRecording, startRecording, stopRecording } = useAudioRecorder();
    const { startListening, stopListening, interimTranscript } = useSpeechRecognition({ lang: sessionLanguage });

    useEffect(() => {
        if (isRecording) {
            timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
        } else if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isRecording]);

    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcriptHistory, interimTranscript]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const processSegment = useCallback(async (blob: Blob, index: number) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
            const base64Audio = (reader.result as string).split(',')[1];
            const context = transcriptHistory.slice(-3).map(t => `${t.speaker}: ${t.text}`).join(' ');
            const results = await processAudioSegment(base64Audio, blob.type, sessionLanguage, doctorProfile, context);
            if (results) {
                const newEntries: TranscriptEntry[] = results.map((r, i) => ({
                    id: `seg-${index}-${i}-${Date.now()}`,
                    speaker: r.speaker,
                    text: r.text,
                    segmentIndex: index
                }));
                setTranscriptHistory(prev => {
                    if (prev.some(e => e.segmentIndex === index)) return prev;
                    return [...prev, ...newEntries];
                });
            }
            processedSegmentsRef.current++;
        };
    }, [sessionLanguage, doctorProfile, transcriptHistory]);

    const handleStartSession = async () => {
        setPhase('active');
        setDuration(0);
        setTranscriptHistory([]);
        setClinicalNote('');
        processedSegmentsRef.current = 0;
        pendingSegmentsQueue.current = [];
        await startRecording({
            segmentDuration: 45000,
            vadThreshold: 0.02,
            minSegmentDuration: 5000,
            onSegment: (blob) => {
                const idx = pendingSegmentsQueue.current.length;
                pendingSegmentsQueue.current.push(blob);
                processSegment(blob, idx);
            }
        });
        startListening();
    };

    const handleStopSession = async () => {
        stopListening();
        setPhase('processing');
        const finalBlob = await stopRecording();
        if (finalBlob) await processSegment(finalBlob, pendingSegmentsQueue.current.length);
        let attempts = 0;
        const checkDone = setInterval(() => {
            if (processedSegmentsRef.current >= pendingSegmentsQueue.current.length || attempts > 10) {
                clearInterval(checkDone);
                setPhase('review');
            }
            attempts++;
        }, 500);
    };

    const handleGenerateNote = async () => {
        setIsGeneratingNote(true);
        const fullTranscript = transcriptHistory.map(t => `${t.speaker}: ${t.text}`).join('\n');
        const note = await generateClinicalNote(fullTranscript, doctorProfile, sessionLanguage);
        setClinicalNote(note);
        setIsGeneratingNote(false);
    };

    const handleDownloadPDF = () => {
        window.print();
    };

    // --- Views ---

    if (phase === 'consent') return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-aivana-dark h-full">
            <div className="w-full max-w-4xl bg-[#1E1E1E] border border-white/5 rounded-3xl p-10 shadow-2xl animate-fadeInUp">
                <div className="text-center mb-12">
                     <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-4">OPD Voice Assistant</h1>
                     <p className="text-xl text-gray-400">Ready to capture consultation.</p>
                </div>

                {/* Quick Patient Setup */}
                <div className="grid grid-cols-2 gap-6 mb-10 p-6 bg-black/30 rounded-2xl border border-white/5">
                    <div>
                         <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Patient Name</label>
                         <input 
                            type="text" 
                            value={patient.name} 
                            onChange={e => setPatient({ ...patient, name: e.target.value })} 
                            className="w-full bg-aivana-dark border border-white/10 rounded-xl px-4 py-3 text-lg text-white focus:border-aivana-accent outline-none"
                            placeholder="e.g. Rajesh Kumar"
                        />
                    </div>
                    <div>
                         <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Language</label>
                         <select 
                            value={sessionLanguage} 
                            onChange={(e) => setSessionLanguage(e.target.value)} 
                            className="w-full bg-aivana-dark border border-white/10 rounded-xl px-4 py-3 text-lg text-white focus:border-aivana-accent outline-none appearance-none"
                        >
                            <option value="Auto-detect">Auto-Detect</option>
                            <option value="English">English</option>
                            <option value="Hindi">Hindi</option>
                            <option value="Marathi">Marathi</option>
                            <option value="Gujarati">Gujarati</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <button 
                        onClick={handleStartSession} 
                        className="w-full py-8 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black text-3xl uppercase tracking-widest shadow-[0_0_40px_rgba(220,38,38,0.4)] transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-4 group"
                    >
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                            <Icon name="microphone" className="w-6 h-6 text-red-600 group-hover:scale-110 transition-transform"/>
                        </div>
                        Start Consultation
                    </button>
                    <button onClick={onEndSession} className="text-gray-500 hover:text-white text-sm font-bold uppercase tracking-widest py-4">Cancel</button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex-1 flex flex-col bg-aivana-dark overflow-hidden h-full">
             <div className="hidden print:block"><PrescriptionTemplate patient={patient} clinicalNote={clinicalNote} /></div>
             
             {/* Header */}
             <header className="h-20 flex-shrink-0 border-b border-white/10 bg-[#121212] flex items-center justify-between px-6 no-print">
                <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${phase === 'active' ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
                    <div>
                        <h2 className="text-lg font-bold text-white uppercase tracking-tight leading-none">{phase === 'active' ? 'Live Recording' : 'Session Review'}</h2>
                        <p className="text-xs text-gray-500 font-mono mt-1">{formatTime(duration)} • {patient.name || 'Unknown Patient'}</p>
                    </div>
                </div>
                
                {phase === 'active' && (
                     <div className="flex-1 max-w-xl mx-8">
                         <AudioWaveform active={true} />
                     </div>
                )}
                
                <div className="flex gap-3">
                    {phase === 'active' ? (
                        <button 
                            onClick={handleStopSession} 
                            className="px-8 py-3 bg-white text-black rounded-xl font-bold uppercase tracking-wider hover:bg-gray-200 transition-colors shadow-lg active:scale-95"
                        >
                            Stop & Analyze
                        </button>
                    ) : (
                        <button onClick={onEndSession} className="px-6 py-2 border border-white/20 text-gray-400 hover:text-white rounded-lg text-xs font-bold uppercase tracking-widest">
                            Exit
                        </button>
                    )}
                </div>
             </header>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden relative no-print">
                 {/* Left Panel: Transcript */}
                 <div className={`${phase === 'review' ? 'w-1/3' : 'w-full max-w-4xl mx-auto'} flex flex-col border-r border-white/5 bg-black/20 transition-all duration-500`}>
                    <div className="p-4 border-b border-white/5 bg-black/40 backdrop-blur-sm sticky top-0 z-10 flex justify-between items-center">
                        <h3 className="text-xs font-black uppercase tracking-widest text-aivana-accent">Live Transcript</h3>
                        {interimTranscript && <span className="text-[10px] text-green-400 animate-pulse">Receiving audio...</span>}
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                        {transcriptHistory.length === 0 && !interimTranscript && (
                             <div className="flex flex-col items-center justify-center h-64 opacity-20">
                                 <Icon name="microphone" className="w-12 h-12 mb-4"/>
                                 <p className="uppercase font-bold tracking-widest text-sm">Waiting for speech...</p>
                             </div>
                        )}
                        
                        {transcriptHistory.map((entry) => (
                            <div key={entry.id} className={`flex flex-col ${entry.speaker === 'Doctor' ? 'items-end' : 'items-start'} animate-fadeInUp`}>
                                <span className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${entry.speaker === 'Doctor' ? 'text-aivana-accent' : 'text-blue-400'}`}>
                                    {entry.speaker}
                                </span>
                                <div className={`p-4 rounded-2xl max-w-[85%] text-base leading-relaxed ${
                                    entry.speaker === 'Doctor' 
                                    ? 'bg-aivana-accent text-white rounded-tr-none' 
                                    : 'bg-[#1E1E2E] text-gray-200 border border-white/5 rounded-tl-none'
                                }`}>
                                    {entry.text}
                                </div>
                            </div>
                        ))}

                        {interimTranscript && (
                            <div className="flex flex-col items-start animate-pulse opacity-70">
                                <span className="text-[10px] font-bold uppercase tracking-wider mb-1 text-gray-500">Listening...</span>
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-gray-300 italic">
                                    {interimTranscript}
                                </div>
                            </div>
                        )}
                        <div ref={transcriptEndRef}></div>
                    </div>
                 </div>

                 {/* Right Panel: Clinical Note (Only in Review) */}
                 {phase !== 'active' && phase !== 'consent' && (
                     <div className={`flex-1 flex flex-col bg-[#0F0F12] transition-opacity duration-500 ${phase === 'processing' ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                        {phase === 'processing' && (
                            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                                <div className="w-16 h-16 border-4 border-aivana-accent border-t-transparent rounded-full animate-spin mb-6"></div>
                                <h3 className="text-2xl font-bold text-white uppercase tracking-widest">Synthesizing Note...</h3>
                            </div>
                        )}

                        <div className="p-4 border-b border-white/5 bg-black/40 flex justify-between items-center">
                            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Clinical SOAP Note</h3>
                            <div className="flex gap-2">
                                {!clinicalNote ? (
                                    <button 
                                        onClick={handleGenerateNote} 
                                        className="px-4 py-2 bg-aivana-accent hover:bg-purple-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
                                    >
                                        Generate Note
                                    </button>
                                ) : (
                                    <>
                                        <button onClick={() => setIsEditingNote(!isEditingNote)} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors">
                                            {isEditingNote ? 'Save' : 'Edit'}
                                        </button>
                                        <button onClick={handleDownloadPDF} className="px-4 py-2 bg-white text-black rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-gray-200 flex items-center gap-2">
                                            <Icon name="document-text" className="w-3 h-3"/> Print
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                           {clinicalNote ? (
                               <div className="bg-white rounded-lg shadow-xl overflow-hidden min-h-[800px]">
                                   {isEditingNote ? (
                                       <textarea 
                                            value={clinicalNote} 
                                            onChange={(e) => setClinicalNote(e.target.value)} 
                                            className="w-full h-full p-8 text-black font-mono text-sm outline-none resize-none"
                                       />
                                   ) : (
                                       <div className="prescription-preview transform scale-[0.85] origin-top">
                                            <PrescriptionTemplate patient={patient} clinicalNote={clinicalNote} isPreview />
                                       </div>
                                   )}
                               </div>
                           ) : (
                               <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-40">
                                   <Icon name="sparkles" className="w-16 h-16 mb-4"/>
                                   <p className="uppercase font-bold tracking-widest">No clinical note generated</p>
                                   <button onClick={handleGenerateNote} className="mt-4 text-aivana-accent underline">Generate Now</button>
                               </div>
                           )}
                        </div>
                     </div>
                 )}
            </div>
        </div>
    );
};
