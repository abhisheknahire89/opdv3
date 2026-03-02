import { DocumentRequirement, DocumentCategory } from '../types';

// Maps ICD-10 codes (or diagnosis categories) to required documents
const diagnosisDocumentMap: Record<string, DocumentCategory[]> = {
    // Respiratory
    'J18': ['chest_xray', 'cbc', 'abg'],           // Pneumonia
    'J12': ['chest_xray', 'cbc', 'covid_test'],    // Viral pneumonia
    'J44': ['chest_xray', 'cbc', 'abg', 'ecg'],    // COPD

    // Cardiac
    'I21': ['ecg', 'cbc', 'lft', 'kft'],           // MI
    'I50': ['ecg', 'chest_xray', 'cbc'],           // Heart failure

    // Infectious
    'A41': ['blood_culture', 'cbc', 'lft', 'kft'], // Sepsis

    // Default for unknown
    'default': ['cbc'],
};

const documentDetails: Record<DocumentCategory, { displayName: string; description: string }> = {
    'chest_xray': { displayName: 'Chest X-Ray', description: 'PA view chest radiograph' },
    'cbc': { displayName: 'CBC Report', description: 'Complete blood count with differential' },
    'abg': { displayName: 'ABG Report', description: 'Arterial blood gas analysis' },
    'ecg': { displayName: 'ECG', description: '12-lead electrocardiogram' },
    'ct_scan': { displayName: 'CT Scan', description: 'Computed tomography report' },
    'mri': { displayName: 'MRI', description: 'Magnetic resonance imaging report' },
    'ultrasound': { displayName: 'Ultrasound', description: 'Ultrasonography report' },
    'blood_culture': { displayName: 'Blood Culture', description: 'Blood culture and sensitivity' },
    'urine_routine': { displayName: 'Urine Routine', description: 'Urine analysis report' },
    'lft': { displayName: 'LFT', description: 'Liver function tests' },
    'kft': { displayName: 'KFT', description: 'Kidney function tests' },
    'covid_test': { displayName: 'COVID-19 Test', description: 'RT-PCR or Rapid Antigen Test' },
    'other': { displayName: 'Other Document', description: 'Additional supporting document' },
};

/**
 * Gets required documents based on ICD-10 code
 */
export const getRequiredDocuments = (icd10Code: string): DocumentRequirement[] => {
    // Get the category (first 3 characters of ICD-10)
    const category = icd10Code.substring(0, 3);

    const requiredCategories = diagnosisDocumentMap[category] || diagnosisDocumentMap['default'];

    return requiredCategories.map((cat, index) => ({
        category: cat,
        displayName: documentDetails[cat].displayName,
        isRequired: index < 2, // First 2 are required, rest optional
        description: documentDetails[cat].description,
    }));
};

/**
 * Matches a filename to a document category
 */
export const guessDocumentCategory = (filename: string): DocumentCategory => {
    const lower = filename.toLowerCase();

    if (lower.includes('xray') || lower.includes('x-ray') || lower.includes('cxr')) return 'chest_xray';
    if (lower.includes('cbc') || lower.includes('blood count')) return 'cbc';
    if (lower.includes('abg') || lower.includes('blood gas')) return 'abg';
    if (lower.includes('ecg') || lower.includes('ekg')) return 'ecg';
    if (lower.includes('ct') || lower.includes('scan')) return 'ct_scan';
    if (lower.includes('mri')) return 'mri';
    if (lower.includes('usg') || lower.includes('ultrasound')) return 'ultrasound';
    if (lower.includes('culture')) return 'blood_culture';
    if (lower.includes('urine')) return 'urine_routine';
    if (lower.includes('lft') || lower.includes('liver')) return 'lft';
    if (lower.includes('kft') || lower.includes('kidney') || lower.includes('renal')) return 'kft';
    if (lower.includes('covid') || lower.includes('rtpcr')) return 'covid_test';

    return 'other';
};
