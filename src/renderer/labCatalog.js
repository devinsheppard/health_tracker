(function initLabCatalog(root, factory) {
  const labCatalog = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = labCatalog;
  }

  root.HealthLabCatalog = labCatalog;
})(typeof globalThis !== 'undefined' ? globalThis : this, function labCatalogFactory() {
  const categories = [
    'CBC / Hematology',
    'CMP / Metabolic',
    'Diabetes',
    'Lipids',
    'Thyroid',
    'Kidney',
    'Liver',
    'Hormones',
    'Vitamins / Nutrition',
    'Inflammation',
    'Autoimmune',
    'Cardiac',
    'Infectious Disease',
    'Urinalysis',
    'Coagulation',
    'Other'
  ];

  const definitions = {
    'CBC / Hematology': [
      ['Complete Blood Count', 'CBC', ['hemogram', 'full blood count'], 'cells/uL', '', 'Panel of red cells, white cells, and platelets.'],
      ['White Blood Cell Count', 'WBC', ['leukocytes', 'white count'], '10^3/uL', '4.0-11.0', 'Editable adult default; lab ranges vary.'],
      ['Red Blood Cell Count', 'RBC', ['erythrocytes', 'red count'], '10^6/uL', '4.2-5.9', 'Editable adult default; lab ranges vary.'],
      ['Hemoglobin', 'Hgb', ['Hb'], 'g/dL', '13.5-17.5', 'Editable adult default; lab ranges vary by sex and lab.'],
      ['Hematocrit', 'Hct', ['packed cell volume', 'PCV'], '%', '38-50', 'Editable adult default; lab ranges vary.'],
      ['Mean Corpuscular Volume', 'MCV', ['mean cell volume'], 'fL', '80-100', 'Red blood cell size marker.'],
      ['Mean Corpuscular Hemoglobin', 'MCH', ['mean cell hemoglobin'], 'pg', '27-33', 'Red cell hemoglobin marker.'],
      ['Mean Corpuscular Hemoglobin Concentration', 'MCHC', ['mean cell hemoglobin concentration'], 'g/dL', '32-36', 'Red cell hemoglobin concentration marker.'],
      ['Red Cell Distribution Width', 'RDW', ['red cell distribution width coefficient'], '%', '11.5-14.5', 'Red blood cell size variability marker.'],
      ['Platelet Count', 'PLT', ['platelets', 'thrombocytes'], '10^3/uL', '150-450', 'Editable adult default; lab ranges vary.'],
      ['Mean Platelet Volume', 'MPV', ['platelet volume'], 'fL', '7.5-12.0', 'Platelet size marker.'],
      ['Neutrophils Percent', 'Neut %', ['segmented neutrophils percent'], '%', '40-70', 'Differential percentage.'],
      ['Neutrophils Absolute', 'ANC', ['absolute neutrophil count'], '10^3/uL', '1.5-8.0', 'Absolute differential count.'],
      ['Lymphocytes Percent', 'Lymph %', ['lymphocyte percent'], '%', '20-45', 'Differential percentage.'],
      ['Lymphocytes Absolute', 'ALC', ['absolute lymphocyte count'], '10^3/uL', '1.0-4.0', 'Absolute differential count.'],
      ['Monocytes Percent', 'Mono %', ['monocyte percent'], '%', '2-10', 'Differential percentage.'],
      ['Monocytes Absolute', 'Mono Abs', ['absolute monocyte count'], '10^3/uL', '0.2-0.8', 'Absolute differential count.'],
      ['Eosinophils Percent', 'Eos %', ['eosinophil percent'], '%', '0-6', 'Differential percentage.'],
      ['Eosinophils Absolute', 'Eos Abs', ['absolute eosinophil count'], '10^3/uL', '0.0-0.5', 'Absolute differential count.'],
      ['Basophils Percent', 'Baso %', ['basophil percent'], '%', '0-2', 'Differential percentage.'],
      ['Basophils Absolute', 'Baso Abs', ['absolute basophil count'], '10^3/uL', '0.0-0.2', 'Absolute differential count.'],
      ['Reticulocyte Count', 'Retic', ['reticulocytes'], '%', '0.5-2.5', 'Immature red blood cell marker.'],
      ['Immature Granulocytes', 'IG', ['immature granulocyte count'], '%', '0-1', 'Differential marker.'],
      ['Nucleated Red Blood Cells', 'NRBC', ['nucleated erythrocytes'], '/100 WBC', '0', 'Usually reported as count or percentage.']
    ],
    'CMP / Metabolic': [
      ['Comprehensive Metabolic Panel', 'CMP', ['chemistry panel', 'metabolic panel'], 'panel', '', 'Common chemistry panel.'],
      ['Basic Metabolic Panel', 'BMP', ['basic chemistry panel'], 'panel', '', 'Common chemistry panel.'],
      ['Glucose', 'GLU', ['blood glucose', 'serum glucose'], 'mg/dL', '70-99', 'Fasting default only; context matters.'],
      ['Calcium', 'Ca', ['serum calcium'], 'mg/dL', '8.6-10.2', 'Editable adult default.'],
      ['Sodium', 'Na', ['serum sodium'], 'mmol/L', '135-145', 'Electrolyte.'],
      ['Potassium', 'K', ['serum potassium'], 'mmol/L', '3.5-5.1', 'Electrolyte.'],
      ['Chloride', 'Cl', ['serum chloride'], 'mmol/L', '98-107', 'Electrolyte.'],
      ['Carbon Dioxide', 'CO2', ['bicarbonate', 'total CO2'], 'mmol/L', '22-29', 'Often reported as CO2 or bicarbonate.'],
      ['Blood Urea Nitrogen', 'BUN', ['urea nitrogen'], 'mg/dL', '7-20', 'Kidney and hydration marker.'],
      ['Creatinine', 'Cr', ['serum creatinine'], 'mg/dL', '0.7-1.3', 'Kidney filtration marker; ranges vary.'],
      ['BUN Creatinine Ratio', 'BUN/Cr', ['bun creatinine ratio'], 'ratio', '10-20', 'Calculated marker.'],
      ['Albumin', 'Alb', ['serum albumin'], 'g/dL', '3.5-5.0', 'Protein status/liver marker.'],
      ['Total Protein', 'TP', ['protein total'], 'g/dL', '6.0-8.3', 'Serum protein marker.'],
      ['Globulin', 'Glob', ['serum globulin'], 'g/dL', '2.0-3.5', 'Calculated serum protein fraction.'],
      ['Albumin Globulin Ratio', 'A/G', ['albumin globulin ratio'], 'ratio', '1.0-2.5', 'Calculated ratio.'],
      ['Alkaline Phosphatase', 'ALP', ['alk phos'], 'U/L', '40-129', 'Liver/bone enzyme.'],
      ['Alanine Aminotransferase', 'ALT', ['SGPT'], 'U/L', '0-44', 'Liver enzyme.'],
      ['Aspartate Aminotransferase', 'AST', ['SGOT'], 'U/L', '0-40', 'Liver enzyme.'],
      ['Total Bilirubin', 'TBili', ['bilirubin total'], 'mg/dL', '0.0-1.2', 'Bilirubin marker.'],
      ['Anion Gap', 'AG', ['serum anion gap'], 'mmol/L', '8-16', 'Calculated electrolyte gap.'],
      ['Osmolality', 'Osm', ['serum osmolality'], 'mOsm/kg', '275-295', 'Serum concentration marker.'],
      ['Magnesium', 'Mg', ['serum magnesium'], 'mg/dL', '1.7-2.2', 'Electrolyte/mineral.'],
      ['Phosphorus', 'Phos', ['phosphate'], 'mg/dL', '2.5-4.5', 'Mineral marker.'],
      ['Uric Acid', 'UA', ['urate'], 'mg/dL', '3.5-7.2', 'Purine metabolism marker.']
    ],
    Diabetes: [
      ['Hemoglobin A1c', 'A1c', ['HbA1c', 'glycated hemoglobin', 'hemoglobin a1c'], '%', '4.0-5.6', 'Editable default; diagnostic cutoffs differ from lab reference ranges.'],
      ['Estimated Average Glucose', 'eAG', ['estimated avg glucose'], 'mg/dL', '', 'Calculated from A1C by some labs.'],
      ['Fasting Glucose', 'FPG', ['fasting plasma glucose'], 'mg/dL', '70-99', 'Fasting context marker.'],
      ['Random Glucose', 'RPG', ['random plasma glucose'], 'mg/dL', '', 'Interpretation depends on context.'],
      ['Oral Glucose Tolerance 1 Hour', 'OGTT 1h', ['glucose tolerance one hour'], 'mg/dL', '', 'Timed glucose challenge result.'],
      ['Oral Glucose Tolerance 2 Hour', 'OGTT 2h', ['glucose tolerance two hour'], 'mg/dL', '<140', 'Editable default; clinical cutoffs vary.'],
      ['Fasting Insulin', 'Insulin', ['serum insulin'], 'uIU/mL', '2-20', 'Insulin marker.'],
      ['C-Peptide', 'C-pep', ['connecting peptide'], 'ng/mL', '0.8-3.5', 'Insulin production marker.'],
      ['Fructosamine', 'Fruct', ['glycated serum protein'], 'umol/L', '205-285', 'Shorter-term glycemic marker.'],
      ['Glycated Albumin', 'GA', ['glycoalbumin'], '%', '11-16', 'Shorter-term glycemic marker.'],
      ['Beta Hydroxybutyrate', 'BHB', ['ketones beta hydroxybutyrate'], 'mmol/L', '<0.6', 'Blood ketone marker.'],
      ['Insulin Antibody', 'IAA', ['insulin autoantibody'], 'U/mL', '', 'Diabetes autoantibody.'],
      ['GAD65 Antibody', 'GAD65', ['glutamic acid decarboxylase antibody'], 'IU/mL', '', 'Diabetes autoantibody.'],
      ['IA-2 Antibody', 'IA-2', ['islet antigen 2 antibody'], 'U/mL', '', 'Diabetes autoantibody.'],
      ['Zinc Transporter 8 Antibody', 'ZnT8', ['znt8 antibody'], 'U/mL', '', 'Diabetes autoantibody.'],
      ['HOMA-IR', 'HOMA-IR', ['homeostatic model assessment insulin resistance'], 'score', '', 'Calculated insulin resistance estimate.']
    ],
    Lipids: [
      ['Lipid Panel', 'Lipids', ['cholesterol panel'], 'panel', '', 'Common lipid panel.'],
      ['Total Cholesterol', 'TC', ['cholesterol total'], 'mg/dL', '<200', 'Lipid marker.'],
      ['LDL Cholesterol', 'LDL-C', ['low density lipoprotein cholesterol'], 'mg/dL', '<100', 'Goal depends on risk profile.'],
      ['HDL Cholesterol', 'HDL-C', ['high density lipoprotein cholesterol'], 'mg/dL', '>40', 'Goal depends on sex/risk profile.'],
      ['Triglycerides', 'TG', ['triglyceride'], 'mg/dL', '<150', 'Lipid marker.'],
      ['Non-HDL Cholesterol', 'Non-HDL-C', ['non hdl cholesterol'], 'mg/dL', '<130', 'Calculated lipid marker.'],
      ['VLDL Cholesterol', 'VLDL-C', ['very low density lipoprotein'], 'mg/dL', '5-40', 'Often calculated.'],
      ['Cholesterol HDL Ratio', 'TC/HDL', ['chol hdl ratio'], 'ratio', '<5.0', 'Calculated ratio.'],
      ['Triglyceride HDL Ratio', 'TG/HDL', ['triglyceride hdl ratio'], 'ratio', '', 'Calculated ratio sometimes used for metabolic risk.'],
      ['Apolipoprotein B', 'ApoB', ['apolipoprotein b100'], 'mg/dL', '<90', 'Atherogenic particle marker; goals vary.'],
      ['Apolipoprotein A1', 'ApoA1', ['apolipoprotein a-i'], 'mg/dL', '110-180', 'HDL-associated apolipoprotein.'],
      ['ApoB ApoA1 Ratio', 'ApoB/A1', ['apob apoa1 ratio'], 'ratio', '', 'Calculated apolipoprotein ratio.'],
      ['Lipoprotein(a)', 'Lp(a)', ['lipoprotein little a'], 'nmol/L', '<75', 'Inherited lipid risk marker; units vary.'],
      ['LDL Particle Number', 'LDL-P', ['ldl particle count'], 'nmol/L', '<1000', 'Advanced lipid marker.'],
      ['Small LDL Particle', 'Small LDL-P', ['small ldl particles'], 'nmol/L', '', 'Advanced lipid marker.'],
      ['HDL Particle Number', 'HDL-P', ['hdl particle count'], 'umol/L', '', 'Advanced lipid marker.']
    ],
    Thyroid: [
      ['Thyroid Stimulating Hormone', 'TSH', ['thyrotropin'], 'uIU/mL', '0.4-4.5', 'Pituitary thyroid signal marker.'],
      ['Free Thyroxine', 'Free T4', ['FT4', 'free t4'], 'ng/dL', '0.8-1.8', 'Free thyroid hormone.'],
      ['Free Triiodothyronine', 'Free T3', ['FT3', 'free t3'], 'pg/mL', '2.3-4.2', 'Free thyroid hormone.'],
      ['Total Thyroxine', 'Total T4', ['TT4', 'total t4'], 'ug/dL', '4.5-12.0', 'Total thyroid hormone.'],
      ['Total Triiodothyronine', 'Total T3', ['TT3', 'total t3'], 'ng/dL', '80-180', 'Total thyroid hormone.'],
      ['Reverse T3', 'rT3', ['reverse triiodothyronine'], 'ng/dL', '9-24', 'Thyroid hormone metabolite.'],
      ['Thyroid Peroxidase Antibody', 'TPO Ab', ['anti tpo', 'thyroid peroxidase antibodies'], 'IU/mL', '<35', 'Autoimmune thyroid marker.'],
      ['Thyroglobulin Antibody', 'Tg Ab', ['anti thyroglobulin'], 'IU/mL', '<20', 'Autoimmune thyroid marker.'],
      ['Thyroglobulin', 'Tg', ['thyroglobulin tumor marker'], 'ng/mL', '', 'Context-dependent thyroid marker.'],
      ['TSH Receptor Antibody', 'TRAb', ['tsh receptor antibodies'], 'IU/L', '', 'Autoimmune thyroid marker.'],
      ['Thyroid Stimulating Immunoglobulin', 'TSI', ['thyroid stimulating immunoglobulin'], '% baseline', '', 'Autoimmune thyroid marker.'],
      ['Free T4 Index', 'FTI', ['free thyroxine index'], 'index', '1.2-4.9', 'Calculated thyroid marker.'],
      ['T3 Uptake', 'T3 Uptake', ['thyroid uptake'], '%', '24-39', 'Binding estimate.'],
      ['Thyroxine Binding Globulin', 'TBG', ['thyroid binding globulin'], 'ug/mL', '13-39', 'Thyroid hormone binding protein.'],
      ['Calcitonin', 'Calcitonin', ['thyroid calcitonin'], 'pg/mL', '', 'Context-dependent thyroid marker.'],
      ['Iodine', 'Iodine', ['serum iodine'], 'ug/L', '', 'Nutrition/thyroid-related marker.']
    ],
    Kidney: [
      ['Estimated Glomerular Filtration Rate', 'eGFR', ['estimated gfr'], 'mL/min/1.73m2', '>60', 'Kidney filtration estimate.'],
      ['Cystatin C', 'CysC', ['serum cystatin c'], 'mg/L', '0.6-1.0', 'Kidney filtration marker.'],
      ['Creatinine Clearance', 'CrCl', ['creatinine clearance'], 'mL/min', '', 'Urine/serum calculated clearance.'],
      ['Urine Albumin Creatinine Ratio', 'UACR', ['microalbumin creatinine ratio'], 'mg/g', '<30', 'Kidney albumin leak marker.'],
      ['Urine Microalbumin', 'Microalb', ['urine albumin'], 'mg/L', '', 'Urine albumin marker.'],
      ['Urine Creatinine', 'UCr', ['creatinine urine'], 'mg/dL', '', 'Urine concentration marker.'],
      ['Urine Protein Creatinine Ratio', 'UPCR', ['protein creatinine ratio'], 'mg/g', '<200', 'Urine protein marker.'],
      ['24 Hour Urine Protein', '24h Protein', ['twenty four hour urine protein'], 'mg/day', '<150', 'Timed urine protein.'],
      ['24 Hour Urine Creatinine', '24h Cr', ['twenty four hour urine creatinine'], 'mg/day', '', 'Timed urine creatinine.'],
      ['Urine Sodium', 'Urine Na', ['sodium urine'], 'mmol/L', '', 'Urine electrolyte.'],
      ['Urine Potassium', 'Urine K', ['potassium urine'], 'mmol/L', '', 'Urine electrolyte.'],
      ['Urine Chloride', 'Urine Cl', ['chloride urine'], 'mmol/L', '', 'Urine electrolyte.'],
      ['Urine Osmolality', 'Urine Osm', ['urine osmolality'], 'mOsm/kg', '', 'Urine concentration marker.'],
      ['Parathyroid Hormone Intact', 'PTH', ['intact pth'], 'pg/mL', '15-65', 'Mineral/kidney-related hormone.'],
      ['Albumin Creatinine Ratio Random', 'ACR', ['random albumin creatinine ratio'], 'mg/g', '<30', 'Kidney albumin ratio.'],
      ['Beta-2 Microglobulin', 'B2M', ['beta 2 microglobulin'], 'mg/L', '', 'Kidney/immune marker.']
    ],
    Liver: [
      ['Gamma Glutamyl Transferase', 'GGT', ['gamma gt'], 'U/L', '0-60', 'Liver/bile duct enzyme.'],
      ['Direct Bilirubin', 'DBili', ['conjugated bilirubin'], 'mg/dL', '0.0-0.3', 'Bilirubin fraction.'],
      ['Indirect Bilirubin', 'IBili', ['unconjugated bilirubin'], 'mg/dL', '0.2-0.8', 'Bilirubin fraction.'],
      ['Lactate Dehydrogenase', 'LDH', ['lactic dehydrogenase'], 'U/L', '140-280', 'Non-specific tissue enzyme.'],
      ['Prothrombin Time', 'PT', ['protime'], 'sec', '11-13.5', 'Liver/coagulation marker.'],
      ['International Normalized Ratio', 'INR', ['prothrombin inr'], 'ratio', '0.8-1.1', 'Coagulation marker; therapeutic ranges differ.'],
      ['Alpha Fetoprotein', 'AFP', ['alpha-fetoprotein'], 'ng/mL', '<10', 'Context-dependent tumor/liver marker.'],
      ['Ammonia', 'NH3', ['serum ammonia'], 'umol/L', '15-45', 'Liver/metabolic marker.'],
      ['Hepatitis A IgM Antibody', 'HAV IgM', ['hepatitis a igm'], 'result', 'negative', 'Infectious hepatitis marker.'],
      ['Hepatitis B Surface Antigen', 'HBsAg', ['hep b surface antigen'], 'result', 'negative', 'Hepatitis B marker.'],
      ['Hepatitis B Surface Antibody', 'Anti-HBs', ['hbsab'], 'mIU/mL', '', 'Hepatitis B immunity marker.'],
      ['Hepatitis B Core Antibody', 'Anti-HBc', ['hbcab'], 'result', 'negative', 'Hepatitis B exposure marker.'],
      ['Hepatitis C Antibody', 'HCV Ab', ['hep c antibody'], 'result', 'negative', 'Hepatitis C screen.'],
      ['Hepatitis C RNA', 'HCV RNA', ['hep c viral load'], 'IU/mL', 'not detected', 'Hepatitis C viral load.'],
      ['Fibrosis-4 Index', 'FIB-4', ['fib 4'], 'score', '', 'Calculated liver fibrosis estimate.'],
      ['Ceruloplasmin', 'Cerulo', ['serum ceruloplasmin'], 'mg/dL', '20-35', 'Copper/liver-related marker.']
    ],
    Hormones: [
      ['Total Testosterone', 'Total T', ['testosterone total'], 'ng/dL', '300-1000', 'Hormone marker; ranges vary by sex/age.'],
      ['Free Testosterone', 'Free T', ['testosterone free'], 'pg/mL', '', 'Hormone marker; methods vary.'],
      ['Bioavailable Testosterone', 'Bio T', ['bioavailable t'], 'ng/dL', '', 'Calculated or measured hormone marker.'],
      ['Sex Hormone Binding Globulin', 'SHBG', ['sex hormone binding globulin'], 'nmol/L', '10-57', 'Hormone binding protein.'],
      ['Estradiol', 'E2', ['estradiol sensitive'], 'pg/mL', '', 'Hormone marker; ranges depend on sex/cycle.'],
      ['Estrone', 'E1', ['serum estrone'], 'pg/mL', '', 'Estrogen marker.'],
      ['Progesterone', 'Prog', ['serum progesterone'], 'ng/mL', '', 'Hormone marker; ranges depend on cycle.'],
      ['Luteinizing Hormone', 'LH', ['lutropin'], 'mIU/mL', '', 'Pituitary hormone.'],
      ['Follicle Stimulating Hormone', 'FSH', ['follitropin'], 'mIU/mL', '', 'Pituitary hormone.'],
      ['Prolactin', 'PRL', ['serum prolactin'], 'ng/mL', '4-15', 'Pituitary hormone; ranges vary.'],
      ['Dehydroepiandrosterone Sulfate', 'DHEA-S', ['dheas'], 'ug/dL', '', 'Adrenal androgen marker.'],
      ['Cortisol AM', 'AM Cortisol', ['morning cortisol'], 'ug/dL', '6-18', 'Timing-dependent adrenal marker.'],
      ['Cortisol PM', 'PM Cortisol', ['evening cortisol'], 'ug/dL', '', 'Timing-dependent adrenal marker.'],
      ['Adrenocorticotropic Hormone', 'ACTH', ['corticotropin'], 'pg/mL', '7-63', 'Pituitary/adrenal marker.'],
      ['Insulin Like Growth Factor 1', 'IGF-1', ['somatomedin c'], 'ng/mL', '', 'Growth hormone axis marker.'],
      ['Growth Hormone', 'GH', ['human growth hormone'], 'ng/mL', '', 'Pulsatile hormone marker.']
    ],
    'Vitamins / Nutrition': [
      ['Vitamin D 25 Hydroxy', '25(OH)D', ['25 hydroxy vitamin d', 'vitamin d'], 'ng/mL', '30-100', 'Editable default; targets vary.'],
      ['Vitamin D 1,25 Dihydroxy', '1,25(OH)2D', ['calcitriol'], 'pg/mL', '18-72', 'Active vitamin D marker.'],
      ['Vitamin B12', 'B12', ['cobalamin'], 'pg/mL', '200-900', 'Nutrition marker.'],
      ['Folate', 'Folate', ['folic acid'], 'ng/mL', '>3', 'Nutrition marker.'],
      ['Red Blood Cell Folate', 'RBC Folate', ['erythrocyte folate'], 'ng/mL', '', 'Longer-term folate marker.'],
      ['Ferritin', 'Ferritin', ['serum ferritin'], 'ng/mL', '30-400', 'Iron storage marker; inflammation affects values.'],
      ['Iron', 'Fe', ['serum iron'], 'ug/dL', '60-170', 'Iron marker.'],
      ['Total Iron Binding Capacity', 'TIBC', ['iron binding capacity'], 'ug/dL', '250-450', 'Iron binding marker.'],
      ['Transferrin Saturation', 'TSAT', ['iron saturation'], '%', '20-50', 'Calculated iron marker.'],
      ['Transferrin', 'Transferrin', ['serum transferrin'], 'mg/dL', '200-360', 'Iron transport protein.'],
      ['Homocysteine', 'Hcy', ['plasma homocysteine'], 'umol/L', '<15', 'Methylation/cardiometabolic marker.'],
      ['Methylmalonic Acid', 'MMA', ['methylmalonate'], 'nmol/L', '0-378', 'B12 functional marker.'],
      ['Zinc', 'Zn', ['serum zinc'], 'ug/dL', '60-130', 'Trace mineral.'],
      ['Copper', 'Cu', ['serum copper'], 'ug/dL', '70-140', 'Trace mineral.'],
      ['Selenium', 'Se', ['serum selenium'], 'ug/L', '70-150', 'Trace mineral.'],
      ['Vitamin A', 'Vit A', ['retinol'], 'ug/dL', '20-60', 'Fat-soluble vitamin marker.'],
      ['Vitamin E', 'Vit E', ['alpha tocopherol'], 'mg/L', '5-20', 'Fat-soluble vitamin marker.'],
      ['Vitamin B1', 'B1', ['thiamine'], 'nmol/L', '', 'Nutrition marker.'],
      ['Vitamin B6', 'B6', ['pyridoxal phosphate', 'PLP'], 'nmol/L', '', 'Nutrition marker.'],
      ['Prealbumin', 'Prealb', ['transthyretin'], 'mg/dL', '15-35', 'Nutrition/inflammation marker.']
    ],
    Inflammation: [
      ['C-Reactive Protein', 'CRP', ['c reactive protein'], 'mg/L', '<10', 'Inflammation marker.'],
      ['High Sensitivity C-Reactive Protein', 'hs-CRP', ['high sensitivity crp'], 'mg/L', '<1', 'Cardiometabolic inflammation marker; risk categories vary.'],
      ['Erythrocyte Sedimentation Rate', 'ESR', ['sed rate'], 'mm/hr', '0-20', 'Inflammation marker; ranges vary by age/sex.'],
      ['Fibrinogen', 'Fibrinogen', ['factor i'], 'mg/dL', '200-400', 'Inflammation/coagulation marker.'],
      ['Interleukin 6', 'IL-6', ['interleukin-6'], 'pg/mL', '', 'Cytokine marker.'],
      ['Tumor Necrosis Factor Alpha', 'TNF-alpha', ['tnf alpha'], 'pg/mL', '', 'Cytokine marker.'],
      ['Procalcitonin', 'PCT', ['serum procalcitonin'], 'ng/mL', '<0.1', 'Inflammation/infection marker.'],
      ['Complement C3', 'C3', ['c3 complement'], 'mg/dL', '90-180', 'Complement marker.'],
      ['Complement C4', 'C4', ['c4 complement'], 'mg/dL', '10-40', 'Complement marker.'],
      ['CH50 Complement', 'CH50', ['total complement activity'], 'U/mL', '', 'Complement function marker.'],
      ['Serum Amyloid A', 'SAA', ['amyloid a'], 'mg/L', '', 'Inflammation marker.'],
      ['Myeloperoxidase', 'MPO', ['mpo inflammation'], 'pmol/L', '', 'Inflammation/cardiovascular marker.'],
      ['Calprotectin Stool', 'Fecal Calprotectin', ['stool calprotectin'], 'ug/g', '<50', 'GI inflammation marker.'],
      ['Lactoferrin Stool', 'Fecal Lactoferrin', ['stool lactoferrin'], 'ug/g', '', 'GI inflammation marker.'],
      ['D-Dimer', 'D-dimer', ['fibrin degradation product'], 'ng/mL FEU', '<500', 'Coagulation/inflammation marker.'],
      ['Haptoglobin', 'Haptoglobin', ['serum haptoglobin'], 'mg/dL', '30-200', 'Inflammation/hemolysis marker.']
    ],
    Autoimmune: [
      ['Antinuclear Antibody', 'ANA', ['ana screen'], 'titer', 'negative', 'Autoimmune screen.'],
      ['ANA Titer', 'ANA Titer', ['antinuclear antibody titer'], 'titer', '', 'Autoimmune marker.'],
      ['Rheumatoid Factor', 'RF', ['rheumatoid factor'], 'IU/mL', '<14', 'Autoimmune arthritis marker.'],
      ['Cyclic Citrullinated Peptide Antibody', 'Anti-CCP', ['ccp antibody'], 'U/mL', '<20', 'Autoimmune arthritis marker.'],
      ['Double Stranded DNA Antibody', 'Anti-dsDNA', ['dsdna antibody'], 'IU/mL', '', 'Autoimmune marker.'],
      ['Smith Antibody', 'Anti-Sm', ['smith antibody'], 'AI', '', 'Autoimmune marker.'],
      ['RNP Antibody', 'Anti-RNP', ['ribonucleoprotein antibody'], 'AI', '', 'Autoimmune marker.'],
      ['SSA Antibody', 'Anti-SSA', ['ro antibody'], 'AI', '', 'Autoimmune marker.'],
      ['SSB Antibody', 'Anti-SSB', ['la antibody'], 'AI', '', 'Autoimmune marker.'],
      ['Scl-70 Antibody', 'Scl-70', ['topoisomerase antibody'], 'AI', '', 'Autoimmune marker.'],
      ['Centromere Antibody', 'ACA', ['anti centromere'], 'AI', '', 'Autoimmune marker.'],
      ['Jo-1 Antibody', 'Jo-1', ['histidyl trna synthetase antibody'], 'AI', '', 'Autoimmune marker.'],
      ['Myeloperoxidase Antibody', 'MPO Ab', ['p-anca mpo'], 'AI', '', 'Vasculitis marker.'],
      ['Proteinase 3 Antibody', 'PR3 Ab', ['c-anca pr3'], 'AI', '', 'Vasculitis marker.'],
      ['Tissue Transglutaminase IgA', 'tTG IgA', ['celiac ttg iga'], 'U/mL', '', 'Celiac screen.'],
      ['Deamidated Gliadin Peptide IgG', 'DGP IgG', ['gliadin igg'], 'U/mL', '', 'Celiac marker.']
    ],
    Cardiac: [
      ['Troponin I', 'TnI', ['cardiac troponin i'], 'ng/L', '', 'Cardiac injury marker; assay-specific.'],
      ['Troponin T', 'TnT', ['cardiac troponin t'], 'ng/L', '', 'Cardiac injury marker; assay-specific.'],
      ['High Sensitivity Troponin I', 'hs-TnI', ['high sensitivity troponin i'], 'ng/L', '', 'Assay-specific cardiac marker.'],
      ['High Sensitivity Troponin T', 'hs-TnT', ['high sensitivity troponin t'], 'ng/L', '', 'Assay-specific cardiac marker.'],
      ['B-Type Natriuretic Peptide', 'BNP', ['brain natriuretic peptide'], 'pg/mL', '<100', 'Heart strain marker.'],
      ['NT-proBNP', 'NT-proBNP', ['n terminal probnp'], 'pg/mL', '', 'Heart strain marker; age-dependent.'],
      ['Creatine Kinase', 'CK', ['creatine phosphokinase', 'CPK'], 'U/L', '40-200', 'Muscle enzyme.'],
      ['CK-MB', 'CK-MB', ['creatine kinase mb'], 'ng/mL', '', 'Cardiac/muscle enzyme fraction.'],
      ['Myoglobin', 'Myoglobin', ['serum myoglobin'], 'ng/mL', '', 'Muscle injury marker.'],
      ['Lipoprotein Associated Phospholipase A2', 'Lp-PLA2', ['lp pla2'], 'nmol/min/mL', '', 'Cardiovascular inflammation marker.'],
      ['Apolipoprotein E Genotype', 'ApoE', ['apoe genotype'], 'genotype', '', 'Genetic lipid marker.'],
      ['Homocysteine Cardiac', 'Hcy Cardiac', ['homocysteine cardiovascular'], 'umol/L', '<15', 'Cardiometabolic marker.'],
      ['Galectin-3', 'Gal-3', ['galectin 3'], 'ng/mL', '', 'Heart failure/fibrosis marker.'],
      ['ST2', 'sST2', ['soluble st2'], 'ng/mL', '', 'Cardiac stress marker.'],
      ['Coenzyme Q10', 'CoQ10', ['ubiquinone'], 'ug/mL', '', 'Nutrition/cardiac-related marker.'],
      ['Omega-3 Index', 'Omega-3', ['epa dha index'], '%', '', 'Fatty acid status marker.']
    ],
    'Infectious Disease': [
      ['HIV 1/2 Antigen Antibody', 'HIV Ag/Ab', ['hiv fourth generation'], 'result', 'negative', 'Screening test.'],
      ['HIV Viral Load', 'HIV RNA', ['hiv rna pcr'], 'copies/mL', 'not detected', 'Viral load.'],
      ['Syphilis Screen', 'RPR', ['rapid plasma reagin'], 'titer', 'nonreactive', 'Syphilis screen/monitoring.'],
      ['Treponema Pallidum Antibody', 'TP Ab', ['treponemal antibody'], 'result', 'negative', 'Syphilis marker.'],
      ['Chlamydia NAAT', 'CT NAAT', ['chlamydia pcr'], 'result', 'negative', 'NAAT test.'],
      ['Gonorrhea NAAT', 'GC NAAT', ['gonorrhea pcr'], 'result', 'negative', 'NAAT test.'],
      ['Tuberculosis Quantiferon', 'QFT', ['quantiferon tb gold'], 'result', 'negative', 'TB immune assay.'],
      ['Lyme Antibody Screen', 'Lyme Ab', ['borrelia antibody'], 'result', 'negative', 'Lyme screen.'],
      ['Mononucleosis Screen', 'Monospot', ['heterophile antibody'], 'result', 'negative', 'EBV-related screen.'],
      ['EBV Viral Capsid IgM', 'EBV VCA IgM', ['epstein barr vca igm'], 'result', 'negative', 'EBV marker.'],
      ['EBV Viral Capsid IgG', 'EBV VCA IgG', ['epstein barr vca igg'], 'result', '', 'EBV marker.'],
      ['CMV IgM', 'CMV IgM', ['cytomegalovirus igm'], 'result', 'negative', 'CMV marker.'],
      ['CMV IgG', 'CMV IgG', ['cytomegalovirus igg'], 'result', '', 'CMV marker.'],
      ['COVID-19 PCR', 'SARS-CoV-2 PCR', ['covid pcr'], 'result', 'negative', 'Respiratory viral test.'],
      ['COVID-19 Antigen', 'SARS-CoV-2 Ag', ['covid antigen'], 'result', 'negative', 'Respiratory viral test.'],
      ['Influenza A PCR', 'Flu A PCR', ['influenza a'], 'result', 'negative', 'Respiratory viral test.'],
      ['Influenza B PCR', 'Flu B PCR', ['influenza b'], 'result', 'negative', 'Respiratory viral test.'],
      ['RSV PCR', 'RSV', ['respiratory syncytial virus'], 'result', 'negative', 'Respiratory viral test.']
    ],
    Urinalysis: [
      ['Urinalysis Complete', 'UA', ['urine analysis'], 'panel', '', 'Urine panel.'],
      ['Urine Color', 'Color', ['urinalysis color'], 'description', '', 'Urinalysis physical property.'],
      ['Urine Appearance', 'Appearance', ['urine clarity'], 'description', 'clear', 'Urinalysis physical property.'],
      ['Urine Specific Gravity', 'SG', ['specific gravity'], 'ratio', '1.005-1.030', 'Urine concentration marker.'],
      ['Urine pH', 'pH', ['urinalysis ph'], 'pH', '5.0-8.0', 'Urine acidity marker.'],
      ['Urine Protein', 'Protein UA', ['protein urinalysis'], 'result', 'negative', 'Dipstick marker.'],
      ['Urine Glucose', 'Glucose UA', ['glucose urinalysis'], 'result', 'negative', 'Dipstick marker.'],
      ['Urine Ketones', 'Ketones UA', ['ketones urinalysis'], 'result', 'negative', 'Dipstick marker.'],
      ['Urine Blood', 'Blood UA', ['hematuria dipstick'], 'result', 'negative', 'Dipstick marker.'],
      ['Urine Bilirubin', 'Bilirubin UA', ['bilirubin urinalysis'], 'result', 'negative', 'Dipstick marker.'],
      ['Urine Urobilinogen', 'Urobilinogen', ['urobilinogen urine'], 'mg/dL', '0.2-1.0', 'Dipstick marker.'],
      ['Urine Nitrite', 'Nitrite UA', ['nitrites urine'], 'result', 'negative', 'Dipstick marker.'],
      ['Urine Leukocyte Esterase', 'LE', ['leukocyte esterase'], 'result', 'negative', 'Dipstick marker.'],
      ['Urine RBC', 'RBC UA', ['red blood cells urine'], '/HPF', '0-2', 'Microscopy marker.'],
      ['Urine WBC', 'WBC UA', ['white blood cells urine'], '/HPF', '0-5', 'Microscopy marker.'],
      ['Urine Bacteria', 'Bacteria UA', ['bacteria urine'], '/HPF', 'none', 'Microscopy marker.'],
      ['Urine Casts', 'Casts UA', ['urinary casts'], '/LPF', 'none', 'Microscopy marker.'],
      ['Urine Crystals', 'Crystals UA', ['urinary crystals'], '/HPF', 'none', 'Microscopy marker.'],
      ['Urine Culture', 'Urine Cx', ['urine bacterial culture'], 'result', 'no growth', 'Culture result.'],
      ['Pregnancy Test Urine', 'hCG Urine', ['urine pregnancy'], 'result', 'negative', 'Urine hCG screen.']
    ],
    Coagulation: [
      ['Activated Partial Thromboplastin Time', 'aPTT', ['ptt'], 'sec', '25-35', 'Coagulation time.'],
      ['Prothrombin Time Coagulation', 'PT', ['protime coagulation'], 'sec', '11-13.5', 'Coagulation time.'],
      ['International Normalized Ratio Coagulation', 'INR', ['inr coagulation'], 'ratio', '0.8-1.1', 'Coagulation ratio; therapeutic ranges differ.'],
      ['Fibrinogen Activity', 'Fibrinogen', ['fibrinogen activity'], 'mg/dL', '200-400', 'Clotting factor marker.'],
      ['Thrombin Time', 'TT', ['thrombin clotting time'], 'sec', '', 'Coagulation time.'],
      ['Anti-Xa Activity', 'Anti-Xa', ['heparin anti xa'], 'IU/mL', '', 'Anticoagulant monitoring marker.'],
      ['Protein C Activity', 'Protein C', ['protein c functional'], '%', '70-150', 'Coagulation protein.'],
      ['Protein S Activity', 'Protein S', ['protein s functional'], '%', '60-150', 'Coagulation protein.'],
      ['Antithrombin Activity', 'AT III', ['antithrombin iii'], '%', '80-120', 'Coagulation inhibitor.'],
      ['Factor VIII Activity', 'Factor VIII', ['factor 8'], '%', '50-150', 'Clotting factor.'],
      ['Factor IX Activity', 'Factor IX', ['factor 9'], '%', '50-150', 'Clotting factor.'],
      ['von Willebrand Factor Antigen', 'vWF Ag', ['von willebrand antigen'], '%', '50-200', 'Bleeding disorder marker.'],
      ['von Willebrand Activity', 'vWF Activity', ['ristocetin cofactor'], '%', '50-200', 'Bleeding disorder marker.'],
      ['Platelet Function Assay', 'PFA', ['platelet function'], 'sec', '', 'Platelet function screen.'],
      ['Lupus Anticoagulant', 'LA', ['lupus anticoagulant screen'], 'result', 'negative', 'Antiphospholipid marker.'],
      ['Cardiolipin Antibody IgG', 'aCL IgG', ['anticardiolipin igg'], 'GPL', '', 'Antiphospholipid marker.']
    ],
    Other: [
      ['Prostate Specific Antigen', 'PSA', ['total psa'], 'ng/mL', '<4.0', 'Context-dependent prostate marker.'],
      ['Free PSA', 'Free PSA', ['psa free'], 'ng/mL', '', 'Context-dependent prostate marker.'],
      ['Carcinoembryonic Antigen', 'CEA', ['cea tumor marker'], 'ng/mL', '<3', 'Context-dependent tumor marker.'],
      ['Cancer Antigen 125', 'CA-125', ['ca125'], 'U/mL', '<35', 'Context-dependent tumor marker.'],
      ['Cancer Antigen 19-9', 'CA 19-9', ['ca19-9'], 'U/mL', '<37', 'Context-dependent tumor marker.'],
      ['Carbohydrate Antigen 15-3', 'CA 15-3', ['ca15-3'], 'U/mL', '<30', 'Context-dependent tumor marker.'],
      ['Human Chorionic Gonadotropin Quantitative', 'hCG Quant', ['beta hcg quantitative'], 'mIU/mL', '', 'Pregnancy/tumor marker depending on context.'],
      ['Lactic Acid', 'Lactate', ['serum lactate'], 'mmol/L', '0.5-2.2', 'Metabolic perfusion marker.'],
      ['Amylase', 'Amylase', ['serum amylase'], 'U/L', '30-110', 'Pancreatic enzyme.'],
      ['Lipase', 'Lipase', ['serum lipase'], 'U/L', '0-160', 'Pancreatic enzyme.'],
      ['Creatine Kinase MB Relative Index', 'CK-MB Index', ['ckmb relative index'], '%', '', 'Calculated muscle/cardiac marker.'],
      ['Lead Blood', 'Lead', ['blood lead level'], 'ug/dL', '<3.5', 'Heavy metal marker.'],
      ['Mercury Blood', 'Mercury', ['blood mercury'], 'ug/L', '', 'Heavy metal marker.'],
      ['Arsenic Blood', 'Arsenic', ['blood arsenic'], 'ug/L', '', 'Heavy metal marker.'],
      ['Lithium Level', 'Lithium', ['serum lithium'], 'mmol/L', '', 'Medication monitoring marker.'],
      ['Valproic Acid Level', 'VPA', ['valproate level'], 'ug/mL', '', 'Medication monitoring marker.'],
      ['Digoxin Level', 'Digoxin', ['serum digoxin'], 'ng/mL', '', 'Medication monitoring marker.'],
      ['Theophylline Level', 'Theophylline', ['serum theophylline'], 'ug/mL', '', 'Medication monitoring marker.'],
      ['Ethanol Level', 'EtOH', ['blood alcohol'], 'mg/dL', '', 'Toxicology marker.'],
      ['Blood Type ABO Rh', 'ABO/Rh', ['blood type'], 'type', '', 'Blood typing result.']
    ]
  };

  const builtInTests = Object.entries(definitions).flatMap(([category, rows]) =>
    rows.map(([displayName, abbreviation, aliases, defaultUnit, referenceRange, notes]) => ({
      id: slug(`${category}-${displayName}`),
      source: 'built-in',
      displayName,
      abbreviation,
      aliases,
      category,
      defaultUnit,
      commonUnits: defaultUnit ? [defaultUnit] : [],
      referenceRange,
      notes
    }))
  );

  function searchBuiltInTests(query = '', options = {}) {
    const normalizedQuery = normalize(query);
    const category = options.category || '';
    return builtInTests
      .filter((test) => !category || test.category === category)
      .filter((test) => !normalizedQuery || searchText(test).includes(normalizedQuery))
      .slice(0, options.limit || 25);
  }

  function findBuiltInTest(id) {
    return builtInTests.find((test) => test.id === id) || null;
  }

  function searchText(test) {
    return normalize([
      test.displayName,
      test.abbreviation,
      test.category,
      ...(test.aliases || [])
    ].join(' '));
  }

  function normalize(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function slug(value) {
    return normalize(value).replace(/\s+/g, '-');
  }

  return { categories, builtInTests, searchBuiltInTests, findBuiltInTest, normalize };
});
