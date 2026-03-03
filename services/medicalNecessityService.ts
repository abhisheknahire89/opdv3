import { PreAuthRecord, MedicalNecessityStatement } from '../components/PreAuthWizard/types';
import { scoreNecessityStrength } from '../utils/strengthScorer';

/**
 * Auto-generates a medical necessity statement from collected data.
 */
export const generateMedicalNecessity = (record: Partial<PreAuthRecord>): MedicalNecessityStatement => {
    const patient = record.patient;
    const clinical = record.clinical;
    const admission = record.admission;
    const cost = record.costEstimate;

    const selectedDx = clinical?.diagnoses?.[clinical.selectedDiagnosisIndex ?? 0];
    const vitals = clinical?.vitals;

    const abnormalFindings: string[] = [];
    const vfList = clinical?.voiceCapturedFindings ?? [];
    vfList.filter(f => f.interpretation !== 'normal').forEach(f => {
        abnormalFindings.push(`• ${f.testName}: ${f.result}`);
    });

    const severityPoints: string[] = [];
    const sev = clinical?.severity;
    if (sev) {
        if (sev.phenoIntensity > 0.7) severityPoints.push('Severe symptom presentation');
        if (sev.urgencyQuotient > 0.7) severityPoints.push('Time-critical intervention required');
        if (sev.deteriorationVelocity > 0.7) severityPoints.push('High risk of rapid deterioration');
    }
    const spo2 = vitals?.spo2 ? parseInt(vitals.spo2) : null;
    if (spo2 !== null && spo2 < 94) severityPoints.push(`Hypoxia (SpO2 ${spo2}%)`);

    const opdContra: string[] = [
        ...(clinical?.reasonForHospitalisation ? [clinical.reasonForHospitalisation] : []),
        ...(spo2 !== null && spo2 < 94 ? ['Oxygen requirement cannot be safely met at home'] : []),
        'Need for continuous inpatient monitoring and IV management',
    ];

    const treatmentLines: string[] = [];
    const plt = clinical?.proposedLineOfTreatment;
    if (plt?.medical) treatmentLines.push('Medical management');
    if (plt?.surgical) treatmentLines.push('Surgical management');
    if (plt?.intensiveCare) treatmentLines.push('Intensive care');
    if (plt?.investigation) treatmentLines.push('Investigation');

    const text = `MEDICAL NECESSITY STATEMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Patient: ${patient?.patientName ?? 'N/A'}, ${patient?.age ?? '?'} years, ${patient?.gender ?? 'N/A'}
Diagnosis: ${selectedDx?.diagnosis ?? 'N/A'} (ICD-10: ${selectedDx?.icd10Code ?? 'N/A'})
Diagnostic Confidence: ${selectedDx ? `${Math.round((selectedDx.probability ?? 0.85) * 100)}%` : 'N/A'}

CLINICAL PRESENTATION:
${clinical?.historyOfPresentIllness || clinical?.chiefComplaints || 'As documented in attached clinical notes.'}

CHIEF COMPLAINTS:
${clinical?.chiefComplaints || 'N/A'}
Duration: ${clinical?.durationOfPresentAilment || 'N/A'}
Nature of Illness: ${clinical?.natureOfIllness || 'N/A'}

RELEVANT CLINICAL FINDINGS:
${clinical?.relevantClinicalFindings || 'As documented.'}

${abnormalFindings.length > 0 ? `KEY ABNORMAL FINDINGS:\n${abnormalFindings.join('\n')}` : ''}

VITAL SIGNS AT PRESENTATION:
BP: ${vitals?.bp || 'N/R'} mmHg | Pulse: ${vitals?.pulse || 'N/R'}/min | Temp: ${vitals?.temp || 'N/R'}°F
SpO2: ${vitals?.spo2 || 'N/R'}% | RR: ${vitals?.rr || 'N/R'}/min

SEVERITY ASSESSMENT:
Overall Risk: ${sev?.overallRisk ?? 'Moderate'}
${severityPoints.map(s => `• ${s}`).join('\n') || '• Moderate severity requiring inpatient care'}

MEDICAL NECESSITY JUSTIFICATION:
Hospitalization is medically necessary due to:
${severityPoints.map(s => `• ${s}`).join('\n') || '• Clinical severity requiring supervised inpatient care'}

WHY OPD MANAGEMENT IS NOT APPROPRIATE:
${opdContra.filter(Boolean).map(c => `• ${c}`).join('\n')}

${clinical?.treatmentTakenSoFar ? `PRIOR TREATMENT:\n${clinical.treatmentTakenSoFar}\n` : ''}

PROPOSED MANAGEMENT:
${treatmentLines.length > 0 ? treatmentLines.map(l => `• ${l}`).join('\n') : '• Medical management'}
• Admission: ${admission?.admissionType ?? 'N/A'} - ${admission?.roomCategory ?? 'General Ward'}
• Expected Length of Stay: ${admission?.expectedLengthOfStay ?? 'N/A'} days (${admission?.expectedDaysInRoom ?? 0} ward + ${admission?.expectedDaysInICU ?? 0} ICU days)
• Total Estimated Cost: ₹${(cost?.totalEstimatedCost ?? 0).toLocaleString('en-IN')}
`;

    const { strength, reasons } = scoreNecessityStrength(record);

    return {
        generatedText: text.trim(),
        wasEdited: false,
        strength,
        strengthReasons: reasons,
        generatedAt: new Date().toISOString(),
    };
};

/**
 * Generates the full IRDAI Part C formatted text from a complete PreAuthRecord
 */
export const generateIRDAITextFromRecord = (record: Partial<PreAuthRecord>): string => {
    const p = record.patient;
    const ins = record.insurance;
    const c = record.clinical;
    const a = record.admission;
    const cost = record.costEstimate;
    const necessity = record.medicalNecessity;
    const decl = record.declarations;
    const selectedDx = c?.diagnoses?.[c.selectedDiagnosisIndex ?? 0];

    const pmh = a?.pastMedicalHistory;
    const pmhList = pmh ? [
        pmh.diabetes.present ? `Diabetes (${pmh.diabetes.duration || 'duration N/A'})` : null,
        pmh.hypertension.present ? `Hypertension (${pmh.hypertension.duration || 'duration N/A'})` : null,
        pmh.heartDisease.present ? `Heart Disease (${pmh.heartDisease.duration || 'duration N/A'})` : null,
        pmh.asthma.present ? `Asthma/COPD (${pmh.asthma.duration || 'duration N/A'})` : null,
        pmh.kidney.present ? `Kidney Disease (${pmh.kidney.duration || 'duration N/A'})` : null,
        pmh.liver.present ? `Liver Disease (${pmh.liver.duration || 'duration N/A'})` : null,
    ].filter(Boolean).join(', ') : 'Nil';

    return `
════════════════════════════════════════════════════════════════════════════════
                     REQUEST FOR CASHLESS HOSPITALISATION
          PRE-AUTHORIZATION FORM – PART C (REVISED) — AIVANA GENERATED
════════════════════════════════════════════════════════════════════════════════
Pre-Auth ID : ${record.id ?? 'PA-DRAFT'}
Generated   : ${new Date().toLocaleString('en-IN')}
Status      : ${record.status?.toUpperCase() ?? 'DRAFT'}

────────────────────────────────────────────────────────────────────────────────
SECTION 1: INSURANCE / TPA / HOSPITAL DETAILS
────────────────────────────────────────────────────────────────────────────────
Insurance Company  : ${ins?.insurerName ?? 'N/A'}
TPA Name           : ${ins?.tpaName ?? 'N/A'}
TPA Card No        : ${ins?.tpaIdCardNumber ?? 'N/A'}

────────────────────────────────────────────────────────────────────────────────
SECTION 2: POLICY DETAILS
────────────────────────────────────────────────────────────────────────────────
Policy Number      : ${ins?.policyNumber ?? 'N/A'}
Policy Type        : ${ins?.policyType ?? 'N/A'}
Policy Period      : ${ins?.policyStartDate ?? 'N/A'} to ${ins?.policyEndDate ?? 'N/A'}
Sum Insured        : ₹${(ins?.sumInsured ?? 0).toLocaleString('en-IN')}
Proposer Name      : ${ins?.proposerName ?? 'N/A'}
Insured Name       : ${ins?.insuredName ?? 'N/A'}
Relationship       : ${ins?.relationshipWithProposer ?? 'N/A'}
${ins?.employeeId ? `Employee ID        : ${ins.employeeId}` : ''}
${ins?.corporateName ? `Corporate Name     : ${ins.corporateName}` : ''}

────────────────────────────────────────────────────────────────────────────────
SECTION 3: PATIENT PERSONAL DETAILS
────────────────────────────────────────────────────────────────────────────────
Patient Name       : ${p?.patientName ?? 'N/A'}
Date of Birth      : ${p?.dateOfBirth ?? 'N/A'}
Age / Gender       : ${p?.age ?? 'N/A'} years / ${p?.gender ?? 'N/A'}
Marital Status     : ${p?.maritalStatus ?? 'N/A'}
Occupation         : ${p?.occupation ?? 'N/A'}
Address            : ${p?.address ?? 'N/A'}, ${p?.city ?? ''}, ${p?.state ?? ''} - ${p?.pincode ?? ''}
Mobile             : ${p?.mobileNumber ?? 'N/A'}
UHID               : ${p?.uhid ?? 'N/A'}
ABHA ID            : ${p?.abhaId ?? 'N/A'}

────────────────────────────────────────────────────────────────────────────────
SECTION 4: CLINICAL DETAILS (Filled by Treating Doctor)
────────────────────────────────────────────────────────────────────────────────
Chief Complaints   : ${c?.chiefComplaints ?? 'N/A'}
Duration           : ${c?.durationOfPresentAilment ?? 'N/A'}
Nature of Illness  : ${c?.natureOfIllness ?? 'N/A'}

Relevant Clinical Findings:
${c?.relevantClinicalFindings ?? 'N/A'}

PROVISIONAL DIAGNOSIS  : ${selectedDx?.diagnosis ?? 'N/A'}
ICD-10 CODE            : ${selectedDx?.icd10Code ?? 'N/A'} — ${selectedDx?.icd10Description ?? 'N/A'}

Proposed Line of Treatment:
[${c?.proposedLineOfTreatment?.medical ? 'X' : ' '}] Medical  [${c?.proposedLineOfTreatment?.surgical ? 'X' : ' '}] Surgical  [${c?.proposedLineOfTreatment?.intensiveCare ? 'X' : ' '}] ICU  [${c?.proposedLineOfTreatment?.investigation ? 'X' : ' '}] Investigation

${necessity ? `\n--- MEDICAL NECESSITY & OPD CONTRAINDICATION -----------------------------------\n${necessity.editedText ?? necessity.generatedText}\n--------------------------------------------------------------------------------` : ''}

────────────────────────────────────────────────────────────────────────────────
SECTION 5: ADMISSION & HOSPITALIZATION DETAILS
────────────────────────────────────────────────────────────────────────────────
Date of Admission  : ${a?.dateOfAdmission ?? 'N/A'}
Time of Admission  : ${a?.timeOfAdmission ?? 'N/A'}
Admission Type     : ${a?.admissionType ?? 'N/A'}
Room Category      : ${a?.roomCategory ?? 'N/A'}
Expected Stay      : ${a?.expectedLengthOfStay ?? 'N/A'} days (Ward: ${a?.expectedDaysInRoom ?? 0}, ICU: ${a?.expectedDaysInICU ?? 0})

Past Medical History: ${pmhList || 'Nil'}

────────────────────────────────────────────────────────────────────────────────
SECTION 6: COST ESTIMATION
────────────────────────────────────────────────────────────────────────────────
Room Rent          : ₹${(cost?.totalRoomCharges ?? 0).toLocaleString('en-IN')}
Nursing Charges    : ₹${(cost?.totalNursingCharges ?? 0).toLocaleString('en-IN')}
ICU Charges        : ₹${(cost?.totalIcuCharges ?? 0).toLocaleString('en-IN')}
OT Charges         : ₹${(cost?.otCharges ?? 0).toLocaleString('en-IN')}
Surgeon Fee        : ₹${(cost?.surgeonFee ?? 0).toLocaleString('en-IN')}
Anesthetist Fee    : ₹${(cost?.anesthetistFee ?? 0).toLocaleString('en-IN')}
Consultant Fee     : ₹${(cost?.consultantFee ?? 0).toLocaleString('en-IN')}
Investigations     : ₹${(cost?.investigationsEstimate ?? 0).toLocaleString('en-IN')}
Medicines          : ₹${(cost?.medicinesEstimate ?? 0).toLocaleString('en-IN')}
Consumables        : ₹${(cost?.consumablesEstimate ?? 0).toLocaleString('en-IN')}
Implants           : ₹${(cost?.totalImplantsCost ?? 0).toLocaleString('en-IN')}
Misc               : ₹${(cost?.miscCharges ?? 0).toLocaleString('en-IN')}
────────────────────────────────────────────────────────────
TOTAL ESTIMATED    : ₹${(cost?.totalEstimatedCost ?? 0).toLocaleString('en-IN')}
CLAIMED FROM INS.  : ₹${(cost?.amountClaimedFromInsurer ?? 0).toLocaleString('en-IN')}

────────────────────────────────────────────────────────────────────────────────
SECTION 7: DECLARATIONS
────────────────────────────────────────────────────────────────────────────────
Doctor Declaration : Dr. ${decl?.doctor?.doctorName ?? 'N/A'} (Reg: ${decl?.doctor?.doctorRegistrationNumber ?? 'N/A'})
Confirmed          : ${decl?.doctor?.confirmed ? 'YES — ' + (decl.doctor.confirmationMethod ?? 'in_app') : 'PENDING'}

Patient Consent    : ${decl?.patient?.agreedToTerms ? 'Patient has consented and agreed to terms' : 'PENDING'}
Hospital Signatory : ${decl?.hospital?.authorizedSignatoryName ?? 'N/A'} (${decl?.hospital?.designation ?? 'N/A'})

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generated by Aivana Clinical Documentation System | ${new Date().toLocaleString('en-IN')}
  `.trim();
};
