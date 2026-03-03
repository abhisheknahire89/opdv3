export interface ICD10Entry {
    code: string;
    description: string;
    commonName?: string;
}

export const ICD10_DATABASE: ICD10Entry[] = [
    // Respiratory
    { code: 'J18.9', description: 'Pneumonia, unspecified organism', commonName: 'Pneumonia' },
    { code: 'J18.0', description: 'Bronchopneumonia, unspecified organism', commonName: 'Bronchopneumonia' },
    { code: 'J44.1', description: 'Chronic obstructive pulmonary disease with acute exacerbation', commonName: 'COPD Exacerbation' },
    { code: 'J44.0', description: 'COPD with acute lower respiratory infection', commonName: 'COPD' },
    { code: 'J45.9', description: 'Asthma, unspecified', commonName: 'Asthma' },
    { code: 'J12.9', description: 'Viral pneumonia, unspecified', commonName: 'Viral Pneumonia' },
    { code: 'J96.0', description: 'Acute respiratory failure, unspecified', commonName: 'Acute Respiratory Failure' },
    { code: 'J22', description: 'Unspecified acute lower respiratory infection', commonName: 'Acute LRTI' },
    // Cardiac
    { code: 'I21.9', description: 'Acute myocardial infarction, unspecified', commonName: 'Heart Attack / MI' },
    { code: 'I21.0', description: 'Acute transmural myocardial infarction of anterior wall', commonName: 'Anterior STEMI' },
    { code: 'I50.9', description: 'Heart failure, unspecified', commonName: 'Heart Failure' },
    { code: 'I50.0', description: 'Congestive heart failure', commonName: 'CHF' },
    { code: 'I48.0', description: 'Paroxysmal atrial fibrillation', commonName: 'Atrial Fibrillation' },
    { code: 'I20.0', description: 'Unstable angina', commonName: 'Unstable Angina / ACS' },
    { code: 'I63.9', description: 'Cerebral infarction, unspecified', commonName: 'Stroke / CVA' },
    { code: 'I64', description: 'Stroke, not specified as haemorrhage or infarction', commonName: 'Stroke' },
    // Infectious
    { code: 'A41.9', description: 'Sepsis, unspecified organism', commonName: 'Sepsis' },
    { code: 'A90', description: 'Dengue fever [classical dengue]', commonName: 'Dengue Fever' },
    { code: 'A91', description: 'Dengue haemorrhagic fever', commonName: 'Dengue Haemorrhagic Fever' },
    { code: 'A01.0', description: 'Typhoid fever', commonName: 'Typhoid' },
    { code: 'B34.9', description: 'Viral infection, unspecified', commonName: 'Viral Fever' },
    // Gastrointestinal
    { code: 'K35.8', description: 'Other and unspecified acute appendicitis', commonName: 'Acute Appendicitis' },
    { code: 'K80.0', description: 'Calculus of gallbladder with acute cholecystitis', commonName: 'Acute Cholecystitis' },
    { code: 'K85.9', description: 'Acute pancreatitis, unspecified', commonName: 'Acute Pancreatitis' },
    { code: 'K92.1', description: 'Melena', commonName: 'GI Bleed' },
    { code: 'K57.3', description: 'Diverticular disease of large intestine without perforation or abscess', commonName: 'Diverticulitis' },
    // Renal
    { code: 'N17.9', description: 'Acute kidney failure, unspecified', commonName: 'Acute Kidney Failure (AKI)' },
    { code: 'N18.6', description: 'End stage renal disease', commonName: 'CKD / ESRD' },
    { code: 'N20.0', description: 'Calculus of kidney', commonName: 'Kidney Stone' },
    { code: 'N39.0', description: 'Urinary tract infection, site not specified', commonName: 'UTI' },
    // Neurological
    { code: 'G40.9', description: 'Epilepsy, unspecified', commonName: 'Epilepsy / Seizures' },
    { code: 'G43.9', description: 'Migraine, unspecified', commonName: 'Migraine' },
    { code: 'G35', description: 'Multiple sclerosis', commonName: 'Multiple Sclerosis' },
    { code: 'G62.9', description: 'Polyneuropathy, unspecified', commonName: 'Neuropathy' },
    // Surgical / Trauma
    { code: 'S06.3', description: 'Focal traumatic brain injury', commonName: 'Head Injury / TBI' },
    { code: 'S72.0', description: 'Fracture of femoral neck', commonName: 'Hip Fracture' },
    { code: 'M16.9', description: 'Coxarthrosis, unspecified', commonName: 'Osteoarthritis Hip (TKR/THR)' },
    { code: 'M17.9', description: 'Gonarthrosis, unspecified', commonName: 'Knee Osteoarthritis' },
    // Endocrine
    { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications', commonName: 'Diabetes (Type 2)' },
    { code: 'E10.9', description: 'Type 1 diabetes mellitus without complications', commonName: 'Diabetes (Type 1)' },
    { code: 'E05.9', description: 'Thyrotoxicosis, unspecified', commonName: 'Hyperthyroidism / Thyroid Crisis' },
    { code: 'E86.0', description: 'Dehydration', commonName: 'Dehydration' },
    // Obstetric & Maternity
    { code: 'O80', description: 'Encounter for full-term uncomplicated delivery', commonName: 'Normal Delivery' },
    { code: 'O82', description: 'Encounter for cesarean delivery without indication', commonName: 'Caesarean Section' },
    { code: 'O14.1', description: 'Severe pre-eclampsia', commonName: 'Pre-eclampsia' },
    // Oncology
    { code: 'C80.1', description: 'Malignant neoplasm, unspecified', commonName: 'Cancer (Unspecified)' },
    // Haematology
    { code: 'D64.9', description: 'Anaemia, unspecified', commonName: 'Anaemia' },
    { code: 'D69.3', description: 'Idiopathic thrombocytopenic purpura', commonName: 'ITP / Low Platelets' },
    // Pediatric
    { code: 'P07.3', description: 'Other preterm infants', commonName: 'Preterm Newborn' },
    { code: 'J21.9', description: 'Acute bronchiolitis, unspecified', commonName: 'Bronchiolitis (Paeds)' },
];

export const searchICD10 = (query: string): ICD10Entry[] => {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    return ICD10_DATABASE.filter(
        entry =>
            entry.code.toLowerCase().includes(q) ||
            entry.description.toLowerCase().includes(q) ||
            (entry.commonName && entry.commonName.toLowerCase().includes(q))
    ).slice(0, 10);
};
