import type {
    Status, Category, Member, Partner, Axis, Lab, PartnerLab,
    ActionCard, ProjectCall, Project, FinancialAgreement,
    Phd, MobilityGrant, ToDoList, ToDoItem,
    Kpi, KpiEntry, BudgetCategory, BudgetDetail,
    MemberActionCard, AxisActionCard, ProjectActionCard, AgreementActionCard,
    Group,
    GroupMember,
    User,
    Comment,
    ProjectMember,
    AgreementMember,
    ProjectPartner,
    ProjectMilestone,
    TimeEntry,
    Formation,
    ProjectFormation,
    ProjectAttachment,
    Program,
    Supplier,
    Expanse,
    SifacLine,
    Publication,
    PublicationMember,
} from '@/lib/types'

export const mockUser: User = {
    first_name: 'Isabelle',
    last_name: 'Petit',
    email: 'isabelle.petit@entreprise.fr'
}

export const mockStatuses: Status[] = [
    { id: 1, label: 'En cours', context: 'action_card' },
    { id: 2, label: 'Planifié', context: 'action_card' },
    { id: 3, label: 'Terminé', context: 'action_card' },
    { id: 4, label: 'Annulé', context: 'action_card' },
    { id: 5, label: 'À traiter', context: 'action_card' },
    { id: 6, label: 'En cours', context: 'project_call' },
    { id: 7, label: 'Terminé', context: 'project_call' },
    { id: 8, label: 'En cours', context: 'todo_item' },
    { id: 9, label: 'Terminé', context: 'todo_item' },
    // --- Projet ---
    { id: 10, label: 'En cours', context: 'project' },
    { id: 11, label: 'Terminé', context: 'project' },
    { id: 12, label: 'Suspendu', context: 'project' },
    { id: 13, label: 'En attente', context: 'project' },
    // --- Convention financière ---
    { id: 14, label: 'En préparation', context: 'financial_agreement' },
    { id: 15, label: 'Active', context: 'financial_agreement' },
    { id: 16, label: 'Soldée', context: 'financial_agreement' },
    { id: 17, label: 'Annulée', context: 'financial_agreement' },
    // --- Participation ---
    { id: 18, label: 'Inscrit', context: 'participation' },
    { id: 19, label: 'Confirmé', context: 'participation' },
    { id: 20, label: 'Présent', context: 'participation' },
    { id: 21, label: 'Absent', context: 'participation' },
    { id: 22, label: 'Excusé', context: 'participation' },
]

export const mockCategories: Category[] = [
    { id: 1, parent_category_id: null, title: 'Formation', color: '#D8CFEE' },
    { id: 2, parent_category_id: 1, title: 'Sensibilisation', color: null },
    { id: 3, parent_category_id: 1, title: 'Doctorat', color: null },
    { id: 4, parent_category_id: null, title: 'Recherche', color: '#EEC5EF' },
    { id: 5, parent_category_id: 4, title: 'Valorisation', color: null },
    { id: 6, parent_category_id: null, title: 'Partenariat', color: '#C5D2EF' },
    { id: 7, parent_category_id: 6, title: 'Gouvernance', color: null },
    { id: 8, parent_category_id: null, title: 'Mobilité', color: '#E7E8E2' },
    { id: 9, parent_category_id: null, title: 'Financier', color: '#EDD803' },
    { id: 10, parent_category_id: null, title: 'Communication', color: '#D8CFEE' },
    { id: 11, parent_category_id: 4, title: 'Publication', color: null },
    { id: 12, parent_category_id: 6, title: 'Convention', color: null },
]

export const mockPartners: Partner[] = [
    { id: 1, name: 'Université X', description: 'Université partenaire principale', color: '#D8CFEE', logo: '', status_id: 1, type: 'Université et grandes écoles', consortium: true },
    { id: 2, name: 'Entreprise A', description: 'Partenaire industriel stratégique', color: '#E7E8E2', logo: '', status_id: 1, type: 'Entreprise privée', consortium: false },
    { id: 3, name: 'Association B', description: 'Association de recherche appliquée', color: '#EEC5EF', logo: '', status_id: 1, type: 'Association', consortium: true },
    { id: 4, name: 'Institut de Recherche', description: 'Institut national de recherche', color: '#C5D2EF', logo: '', status_id: 1, type: 'Établissement public', consortium: false },
    { id: 5, name: 'Collectivité D', description: 'Collectivité territoriale partenaire', color: '#EDD803', logo: '', status_id: 1, type: 'Collectivité', consortium: false },
    { id: 6, name: 'Fondation E', description: 'Fondation de financement scientifique', color: '#EEC5EF', logo: '', status_id: 1, type: 'Fondation', consortium: false },
    { id: 7, name: 'Labo NumSci', description: 'Laboratoire sciences du numérique', color: '#BAE6FD', logo: '', status_id: 1, type: 'Laboratoire académique', consortium: true },
    { id: 8, name: 'Entreprise B', description: 'PME spécialisée en instrumentation', color: '#D9F99D', logo: '', status_id: 1, type: 'Entreprise privée', consortium: false },
    { id: 9, name: 'GreenTech', description: 'Startup solutions environnementales', color: '#6EE7B7', logo: '', status_id: 1, type: 'Entreprise privée', consortium: false },
    { id: 10, name: 'Région Sud', description: 'Collectivité régionale partenaire', color: '#FDE68A', logo: '', status_id: 1, type: 'Collectivité', consortium: false },
    { id: 11, name: 'Métropole', description: 'Établissement public de coopération inter.', color: '#FCA5A5', logo: '', status_id: 1, type: 'Collectivité', consortium: false },
    { id: 12, name: 'École Sup', description: 'Grande école ingénierie et management', color: '#A5B4FC', logo: '', status_id: 1, type: 'Université et grandes écoles', consortium: true },
    { id: 13, name: 'CHU', description: 'Centre hospitalier universitaire partenaire', color: '#FBCFE8', logo: '', status_id: 1, type: 'Établissement public', consortium: false },
    { id: 14, name: 'ONG Coopération', description: 'ONG coopération internationale', color: '#FCD34D', logo: '', status_id: 1, type: 'Association', consortium: false },
]

export const mockLabs: Lab[] = [
    { id: 1, name: 'LRGE', description: 'Laboratoire de Recherche en Génie Environnemental', type: 'Laboratoire académique', topic: 'Environnement, énergie' },
    { id: 2, name: 'UMR 42', description: 'Unité mixte de recherche en sciences cognitives', type: 'Unité mixte de recherche', topic: 'Sciences cognitives, IA' },
    { id: 3, name: 'CERI', description: 'Centre d\'Études et de Recherche en Innovation', type: 'Centre de recherche', topic: 'Innovation, transfert techno' },
]

export const mockPartnerLabs: PartnerLab[] = [
    { id: 1, lab_id: 1, partner_id: 1 },
    { id: 2, lab_id: 1, partner_id: 4 },
    { id: 3, lab_id: 2, partner_id: 1 },
    { id: 4, lab_id: 3, partner_id: 2 },
    { id: 5, lab_id: 3, partner_id: 4 },
]

export const mockMembers: Member[] = [
    // Université X
    { id: 1, partner_id: 1, lab_id: 1, first_name: 'Marie', last_name: 'Dupont', position: 'Coordinatrice de projet', email: 'marie.dupont@univ.fr', tel: '0600000001', genre: 'F', status: 'Enseignant-chercheur', profile_image: '', is_staff: true },
    { id: 2, partner_id: 1, lab_id: 1, first_name: 'Thomas', last_name: 'Martin', position: 'Enseignant-chercheur', email: 'thomas.martin@univ.fr', tel: '0600000002', genre: 'M', status: 'Enseignant-chercheur', profile_image: '', is_staff: true },
    { id: 3, partner_id: 1, lab_id: 0, first_name: 'Claire', last_name: 'Bernard', position: 'Gestionnaire', email: 'claire.bernard@univ.fr', tel: '0600000003', genre: 'F', status: 'BIATSS', profile_image: '', is_staff: true },
    { id: 4, partner_id: 1, lab_id: 2, first_name: 'Antoine', last_name: 'Leroy', position: 'Doctorant', email: 'antoine.leroy@univ.fr', tel: '0600000004', genre: 'M', status: 'Doctorant', profile_image: '', is_staff: false },
    { id: 5, partner_id: 1, lab_id: 2, first_name: 'Sophie', last_name: 'Girard', position: 'Maîtresse de conférences', email: 'sophie.girard@univ.fr', tel: '0600000005', genre: 'F', status: 'Enseignant-chercheur', profile_image: '', is_staff: true },
    // Entreprise A
    { id: 6, partner_id: 2, lab_id: 3, first_name: 'Julien', last_name: 'Moreau', position: 'Responsable R&D', email: 'julien.moreau@entreprise.fr', tel: '0600000006', genre: 'M', status: 'Salarié', profile_image: '', is_staff: false },
    { id: 7, partner_id: 2, lab_id: 0, first_name: 'Isabelle', last_name: 'Petit', position: 'Chargée de partenariats', email: 'isabelle.petit@entreprise.fr', tel: '0600000007', genre: 'F', status: 'Salarié', profile_image: '', is_staff: false },
    { id: 8, partner_id: 2, lab_id: 0, first_name: 'Nicolas', last_name: 'Roux', position: 'Ingénieur senior', email: 'nicolas.roux@entreprise.fr', tel: '0600000008', genre: 'M', status: 'Salarié', profile_image: '', is_staff: false },
    // Association B
    { id: 9, partner_id: 3, lab_id: 0, first_name: 'Lucie', last_name: 'Fontaine', position: 'Directrice', email: 'lucie.fontaine@assoc.fr', tel: '0600000009', genre: 'F', status: 'Salarié', profile_image: '', is_staff: false },
    { id: 10, partner_id: 3, lab_id: 0, first_name: 'Paul', last_name: 'Chevalier', position: 'Chargé de mission', email: 'paul.chevalier@assoc.fr', tel: '0600000010', genre: 'M', status: 'Salarié', profile_image: '', is_staff: false },
    { id: 11, partner_id: 3, lab_id: 0, first_name: 'Emma', last_name: 'Simon', position: 'Coordinatrice scientifique', email: 'emma.simon@assoc.fr', tel: '0600000011', genre: 'F', status: 'Salarié', profile_image: '', is_staff: false },
    // Institut de Recherche
    { id: 12, partner_id: 4, lab_id: 1, first_name: 'François', last_name: 'Lambert', position: 'Directeur de recherche', email: 'f.lambert@inr.fr', tel: '0600000012', genre: 'M', status: 'Chercheur', profile_image: '', is_staff: true },
    { id: 13, partner_id: 4, lab_id: 1, first_name: 'Nathalie', last_name: 'Mercier', position: 'Ingénieure de recherche', email: 'n.mercier@inr.fr', tel: '0600000013', genre: 'F', status: 'Chercheur', profile_image: '', is_staff: true },
    { id: 14, partner_id: 4, lab_id: 3, first_name: 'Adrien', last_name: 'Blanc', position: 'Post-doctorant', email: 'a.blanc@inr.fr', tel: '0600000014', genre: 'M', status: 'Post-doc', profile_image: '', is_staff: false },
    // Collectivité D
    { id: 15, partner_id: 5, lab_id: 0, first_name: 'Christine', last_name: 'Rousseau', position: 'Élue référente', email: 'c.rousseau@collectivite.fr', tel: '0600000015', genre: 'F', status: 'Élu', profile_image: '', is_staff: false },
    { id: 16, partner_id: 5, lab_id: 0, first_name: 'Marc', last_name: 'Garnier', position: 'Chargé de coopération', email: 'm.garnier@collectivite.fr', tel: '0600000016', genre: 'M', status: 'Fonctionnaire', profile_image: '', is_staff: false },
    // Fondation E
    { id: 17, partner_id: 6, lab_id: 0, first_name: 'Alice', last_name: 'Fournier', position: 'Responsable programmes', email: 'a.fournier@fondation.fr', tel: '0600000017', genre: 'F', status: 'Salarié', profile_image: '', is_staff: false },
    { id: 18, partner_id: 6, lab_id: 0, first_name: 'Bruno', last_name: 'Morin', position: 'Analyste financier', email: 'b.morin@fondation.fr', tel: '0600000018', genre: 'M', status: 'Salarié', profile_image: '', is_staff: false },

]

export const mockGroup: Group[] = [
    { id: 1, name: 'Groupe de travail 1', owner_id: 1 },
    { id: 2, name: 'Groupe de travail 2', owner_id: 1 },
    { id: 3, name: 'Groupe de travail 3', owner_id: 2 },
    { id: 4, name: 'Groupe de travail 4', owner_id: 4 },
]

export const mockGroupMember: GroupMember[] = [
    // Groupe 1 — membres université + institut
    { id: 1, member_id: 1, group_id: 1 },
    { id: 2, member_id: 2, group_id: 1 },
    { id: 3, member_id: 5, group_id: 1 },
    { id: 4, member_id: 12, group_id: 1 },
    { id: 5, member_id: 13, group_id: 1 },

    // Groupe 2 — membres entreprise + fondation
    { id: 6, member_id: 6, group_id: 2 },
    { id: 7, member_id: 7, group_id: 2 },
    { id: 8, member_id: 17, group_id: 2 },
    { id: 9, member_id: 18, group_id: 2 },

    // Groupe 3 — membres association + collectivité
    { id: 10, member_id: 9, group_id: 3 },
    { id: 11, member_id: 10, group_id: 3 },
    { id: 12, member_id: 15, group_id: 3 },
    { id: 13, member_id: 16, group_id: 3 },

    // Groupe 4 — transversal (chercheurs/doctorants)
    { id: 14, member_id: 4, group_id: 4 },
    { id: 15, member_id: 5, group_id: 4 },
    { id: 16, member_id: 14, group_id: 4 },
    { id: 17, member_id: 2, group_id: 4 },

    // Quelques membres dans plusieurs groupes
    { id: 18, member_id: 1, group_id: 4 },
    { id: 19, member_id: 12, group_id: 3 },
]

export const mockAxes: Axis[] = [
    { id: 1, name: 'Axe 1 – Formation', description: 'Actions liées à la formation et à la pédagogie' },
    { id: 2, name: 'Axe 2 – Recherche', description: 'Actions liées à la recherche et à la valorisation' },
    { id: 3, name: 'Axe 3 – International', description: 'Actions liées à la mobilité et aux partenariats internationaux' },
    { id: 4, name: 'Axe 4 – Innovation', description: 'Actions liées au transfert de technologie et à l\'innovation' },
]

export const mockActionCards: ActionCard[] = [
    // --- 2025 ---
    { id: 1, owner_id: 1, category_id: 2, status_id: 3, title: 'Séminaire de lancement AAP', color: '', description: 'Organisation du séminaire de lancement de l\'appel à projets. Indicateur cible : 80 participants.', start_date: '2025-09-01', end_date: '2025-09-15' },
    { id: 2, owner_id: 2, category_id: 2, status_id: 3, title: 'Module de sensibilisation étudiants', color: '', description: 'Conception d\'un module pédagogique de 3h destiné aux étudiants de L3 et M1.', start_date: '2025-10-01', end_date: '2025-12-15' },
    { id: 3, owner_id: 2, category_id: 3, status_id: 3, title: 'Atelier doctorants – Rédaction scientifique', color: '', description: 'Atelier de 2 jours animé par un enseignant-chercheur senior.', start_date: '2025-11-10', end_date: '2025-11-20' },
    { id: 4, owner_id: 1, category_id: 11, status_id: 3, title: 'Dépôt rapport intermédiaire AAP-01', color: '', description: 'Rédaction et dépôt du rapport intermédiaire pour l\'appel à projets AAP-01.', start_date: '2025-06-01', end_date: '2025-06-30' },
    { id: 5, owner_id: 2, category_id: 5, status_id: 3, title: 'Publication actes de colloque', color: '', description: 'Coordination de la publication des actes du colloque annuel.', start_date: '2025-05-01', end_date: '2025-07-31' },
    { id: 6, owner_id: 3, category_id: 12, status_id: 3, title: 'Convention partenariat Entreprise A', color: '', description: 'Finalisation de la convention de partenariat. Budget engagé : 45 000 €.', start_date: '2025-05-15', end_date: '2025-06-15' },
    { id: 7, owner_id: 1, category_id: 7, status_id: 3, title: 'Réunion comité de pilotage Q3 2025', color: '', description: 'Réunion trimestrielle du comité de pilotage.', start_date: '2025-07-10', end_date: '2025-07-11' },
    { id: 8, owner_id: 4, category_id: 8, status_id: 3, title: 'Bourse de mobilité – Conférence Berlin', color: '', description: 'Mobilité sortante pour présentation de travaux. Montant estimé : 1 200 €.', start_date: '2025-09-22', end_date: '2025-09-26' },
    { id: 9, owner_id: 2, category_id: 3, status_id: 1, title: 'Suivi thèse – Co-tutelle internationale', color: '', description: 'Encadrement d\'une thèse en co-tutelle internationale.', start_date: '2024-10-01', end_date: '2027-09-30' },
    { id: 10, owner_id: 3, category_id: 9, status_id: 3, title: 'Ventilation dépenses SIFAC – T1 2025', color: '', description: 'Ventilation des enregistrements financiers SIFAC du premier trimestre.', start_date: '2025-04-01', end_date: '2025-04-30' },
    { id: 11, owner_id: 3, category_id: 9, status_id: 3, title: 'Révision annexe financière partenaire B', color: '', description: 'Mise à jour de l\'annexe financière suite à un redéploiement budgétaire.', start_date: '2025-08-01', end_date: '2025-08-31' },
    { id: 12, owner_id: 1, category_id: 10, status_id: 3, title: 'Mise à jour site web du projet', color: '', description: 'Publication des derniers résultats et actualités.', start_date: '2025-10-10', end_date: '2025-10-25' },
    { id: 13, owner_id: 6, category_id: 4, status_id: 3, title: 'Étude de faisabilité – Transfert techno', color: '', description: 'Étude de faisabilité pour le transfert technologique avec Entreprise A.', start_date: '2025-09-01', end_date: '2025-11-30' },
    { id: 14, owner_id: 12, category_id: 11, status_id: 3, title: 'Soumission article – Journal Q1', color: '', description: 'Rédaction et soumission d\'un article dans un journal de rang Q1.', start_date: '2025-10-01', end_date: '2025-12-15' },
    { id: 15, owner_id: 9, category_id: 12, status_id: 3, title: 'Renouvellement convention Association B', color: '', description: 'Négociation et signature du renouvellement de la convention triennale.', start_date: '2025-11-01', end_date: '2025-12-31' },

    // --- Janvier–Avril 2026 ---
    { id: 16, owner_id: 1, category_id: 7, status_id: 3, title: 'Comité de pilotage Q1 2026', color: '', description: 'Réunion de pilotage du premier trimestre 2026.', start_date: '2026-01-15', end_date: '2026-01-16' },
    { id: 17, owner_id: 5, category_id: 2, status_id: 3, title: 'Journée portes ouvertes Masters', color: '', description: 'Organisation de la journée d\'information pour les masters du programme.', start_date: '2026-01-20', end_date: '2026-01-20' },
    { id: 18, owner_id: 14, category_id: 4, status_id: 3, title: 'Colloque international IA & Éducation', color: '', description: 'Organisation et participation au colloque annuel.', start_date: '2026-02-03', end_date: '2026-02-05' },
    { id: 19, owner_id: 3, category_id: 9, status_id: 3, title: 'Clôture budgétaire exercice 2025', color: '', description: 'Finalisation des opérations comptables de l\'exercice 2025.', start_date: '2026-01-05', end_date: '2026-01-31' },
    { id: 20, owner_id: 7, category_id: 12, status_id: 3, title: 'Accord-cadre Institut de Recherche', color: '', description: 'Signature de l\'accord-cadre de coopération avec l\'Institut national.', start_date: '2026-02-10', end_date: '2026-02-28' },
    { id: 21, owner_id: 13, category_id: 5, status_id: 3, title: 'Déposit brevet – Procédé innovant', color: '', description: 'Dépôt d\'un brevet conjoint sur un procédé de traitement des données.', start_date: '2026-03-01', end_date: '2026-03-15' },
    { id: 22, owner_id: 2, category_id: 3, status_id: 3, title: 'Soutenance thèse – Dupuis Rémi', color: '', description: 'Soutenance de thèse de doctorat.', start_date: '2026-03-20', end_date: '2026-03-20' },
    { id: 23, owner_id: 15, category_id: 6, status_id: 3, title: 'Forum collectivités & universités', color: '', description: 'Participation au forum annuel des partenariats collectivités/universités.', start_date: '2026-03-25', end_date: '2026-03-27' },
    { id: 24, owner_id: 17, category_id: 9, status_id: 3, title: 'Appel à projets Fondation E – Session 1', color: '', description: 'Instruction des dossiers de candidature de la session 1.', start_date: '2026-04-01', end_date: '2026-04-30' },
    { id: 25, owner_id: 8, category_id: 4, status_id: 3, title: 'Revue de littérature – IA générative', color: '', description: 'Revue systématique de la littérature pour l\'état de l\'art.', start_date: '2026-04-07', end_date: '2026-04-25' },

    // --- Mai–Juillet 2026 (autour de la date courante) ---
    { id: 26, owner_id: 1, category_id: 2, status_id: 1, title: 'Formation équipe – Outils numériques', color: '', description: 'Formation de l\'équipe projet aux nouveaux outils collaboratifs.', start_date: '2026-05-05', end_date: '2026-05-16' },
    { id: 27, owner_id: 12, category_id: 11, status_id: 1, title: 'Rédaction livre blanc – Innovation', color: '', description: 'Coordination de la rédaction d\'un livre blanc sur l\'innovation en recherche.', start_date: '2026-05-01', end_date: '2026-06-30' },
    { id: 28, owner_id: 6, category_id: 4, status_id: 2, title: 'Prototype démonstrateur – Phase 2', color: '', description: 'Développement de la deuxième phase du prototype technologique.', start_date: '2026-05-15', end_date: '2026-07-31' },
    { id: 29, owner_id: 3, category_id: 9, status_id: 1, title: 'Ventilation dépenses SIFAC – T1 2026', color: '', description: 'Ventilation des enregistrements financiers du premier trimestre 2026.', start_date: '2026-05-01', end_date: '2026-05-31' },
    { id: 30, owner_id: 5, category_id: 10, status_id: 1, title: 'Campagne réseaux sociaux – Résultats', color: '', description: 'Lancement d\'une campagne de communication sur les résultats du programme.', start_date: '2026-05-20', end_date: '2026-06-10' },
    { id: 31, owner_id: 1, category_id: 7, status_id: 2, title: 'Comité de pilotage Q2 2026', color: '', description: 'Réunion de pilotage du deuxième trimestre 2026.', start_date: '2026-06-05', end_date: '2026-06-06' },
    { id: 32, owner_id: 4, category_id: 8, status_id: 2, title: 'École d\'été internationale', color: '', description: 'Participation et co-organisation de l\'école d\'été.', start_date: '2026-06-22', end_date: '2026-07-03' },
    { id: 33, owner_id: 11, category_id: 12, status_id: 2, title: 'Avenant convention Association B', color: '', description: 'Rédaction et validation d\'un avenant à la convention en cours.', start_date: '2026-06-01', end_date: '2026-06-30' },
    { id: 34, owner_id: 13, category_id: 5, status_id: 2, title: 'Présentation valorisation – Salon Tech', color: '', description: 'Présentation des travaux de valorisation au salon professionnel.', start_date: '2026-07-08', end_date: '2026-07-10' },
    { id: 35, owner_id: 18, category_id: 9, status_id: 2, title: 'Audit financier mi-parcours', color: '', description: 'Audit intermédiaire des dépenses engagées sur le programme.', start_date: '2026-07-01', end_date: '2026-07-15' },

    // --- Août–Décembre 2026 ---
    { id: 36, owner_id: 2, category_id: 3, status_id: 2, title: 'Rentrée doctorale 2026', color: '', description: 'Accueil et intégration des nouveaux doctorants.', start_date: '2026-09-01', end_date: '2026-09-05' },
    { id: 37, owner_id: 16, category_id: 6, status_id: 2, title: 'Partenariat Collectivité D – Phase 2', color: '', description: 'Lancement de la deuxième phase du partenariat territorial.', start_date: '2026-09-15', end_date: '2026-10-31' },
    { id: 38, owner_id: 5, category_id: 2, status_id: 2, title: 'MOOC – Développement durable', color: '', description: 'Création d\'un MOOC sur les enjeux du développement durable.', start_date: '2026-09-01', end_date: '2026-11-30' },
    { id: 39, owner_id: 17, category_id: 9, status_id: 2, title: 'Appel à projets Fondation E – Session 2', color: '', description: 'Instruction des dossiers de candidature de la session 2.', start_date: '2026-10-01', end_date: '2026-10-31' },
    { id: 40, owner_id: 1, category_id: 7, status_id: 2, title: 'Comité de pilotage Q3 2026', color: '', description: 'Réunion de pilotage du troisième trimestre.', start_date: '2026-10-08', end_date: '2026-10-09' },
    { id: 41, owner_id: 10, category_id: 10, status_id: 2, title: 'Rapport annuel programme 2026', color: '', description: 'Rédaction et publication du rapport annuel d\'activités.', start_date: '2026-11-01', end_date: '2026-11-30' },
    { id: 42, owner_id: 12, category_id: 4, status_id: 2, title: 'Conférence de clôture programme', color: '', description: 'Organisation de la conférence finale du programme.', start_date: '2026-12-01', end_date: '2026-12-03' },

    // --- Sans date (pour le kanban) ---
    { id: 43, owner_id: 2, category_id: 2, status_id: 5, title: 'Conception module e-learning', color: '', description: 'Concevoir un module e-learning sur les bonnes pratiques de recherche.', start_date: '', end_date: '' },
    { id: 44, owner_id: 6, category_id: 4, status_id: 5, title: 'Définir protocole expérimental', color: '', description: 'Établir le protocole expérimental pour la phase 3 du projet de recherche.', start_date: '', end_date: '' },
    { id: 45, owner_id: 3, category_id: 9, status_id: 5, title: 'Préparer dossier financement 2027', color: '', description: 'Constituer le dossier de demande de financement pour la période suivante.', start_date: '', end_date: '' },
]

export const mockProjectCalls: ProjectCall[] = [
    { id: 1, axis_id: 1, title: 'AAP-01 – Formation innovante', description: 'Appel à projets pour des actions de formation innovante.', start_date: '2024-01-01', end_date: '2025-12-31', status_id: 7, budget: 150000 },
    { id: 2, axis_id: 2, title: 'AAP-02 – Recherche appliquée', description: 'Appel à projets pour des travaux de recherche appliquée.', start_date: '2024-06-01', end_date: '2026-05-31', status_id: 6, budget: 300000 },
    { id: 3, axis_id: 3, title: 'AAP-03 – Mobilité internationale', description: 'Appel à projets pour les mobilités et coopérations.', start_date: '2025-01-01', end_date: '2026-12-31', status_id: 6, budget: 120000 },
    { id: 4, axis_id: 4, title: 'AAP-04 – Innovation et transfert', description: 'Appel à projets pour l\'innovation et le transfert de technologie.', start_date: '2025-06-01', end_date: '2027-05-31', status_id: 6, budget: 250000 },
]

export const mockProjects: Project[] = [
    { id: 1, project_call_id: 1, status_id: 11, title: 'Projet Formation Numérique', description: 'Développement d\'outils pédagogiques numériques pour les formations universitaires de premier cycle.', budget: 120000, start_date: '2024-01-01', end_date: '2025-12-31' },
    { id: 2, project_call_id: 2, status_id: 10, title: 'Projet Recherche IA', description: 'Programme de recherche appliquée sur l\'utilisation de l\'IA dans l\'analyse de données scientifiques.', budget: 200000, start_date: '2024-06-01', end_date: '2026-05-31' },
    { id: 3, project_call_id: 3, status_id: 10, title: 'Projet Mobilités Europe', description: 'Financement de mobilités sortantes et accueil de chercheurs européens dans le cadre du programme Erasmus+.', budget: 85000, start_date: '2025-01-01', end_date: '2026-12-31' },
    { id: 4, project_call_id: 4, status_id: 10, title: 'Projet Transfert Technologique', description: 'Valorisation et transfert de brevets issus des travaux de recherche vers le secteur industriel partenaire.', budget: 160000, start_date: '2025-03-01', end_date: '2027-02-28' },
    // Projets se terminant bientôt (< 60 jours)
    { id: 5, project_call_id: 2, status_id: 10, title: 'Projet Data Science Territoires', description: 'Analyse des données territoriales pour améliorer les politiques publiques locales.', budget: 95000, start_date: '2025-06-01', end_date: '2026-07-15' },
    { id: 6, project_call_id: 1, status_id: 13, title: 'Projet Open Badges', description: 'Développement d\'un système de certification numérique par badges ouverts pour les formations.', budget: 40000, start_date: '2025-09-01', end_date: '2026-06-30' },
    // Projets en retard (date dépassée + statut actif)
    { id: 7, project_call_id: 2, status_id: 10, title: 'Projet Biodiversité Urbaine', description: 'Étude et cartographie de la biodiversité en milieu urbain en partenariat avec la collectivité.', budget: 72000, start_date: '2024-03-01', end_date: '2025-12-31' },
    { id: 8, project_call_id: 3, status_id: 13, title: 'Projet Coopération Sud', description: 'Programme de coopération universitaire avec des établissements d\'Afrique subsaharienne.', budget: 55000, start_date: '2024-01-01', end_date: '2025-09-30' },
    // Projets actifs sans membres (alerte)
    { id: 9, project_call_id: 4, status_id: 10, title: 'Projet Hydrogène Vert', description: 'Recherche sur les usages de l\'hydrogène vert comme vecteur énergétique dans l\'industrie.', budget: 280000, start_date: '2026-01-01', end_date: '2028-12-31' },
    // Autres projets pour enrichir les stats
    { id: 10, project_call_id: 4, status_id: 12, title: 'Projet Smart Campus', description: 'Déploiement de capteurs IoT et tableaux de bord énergétiques sur le campus universitaire.', budget: 130000, start_date: '2024-09-01', end_date: '2026-08-31' },
    { id: 11, project_call_id: 1, status_id: 11, title: 'Projet Inclusion Numérique', description: 'Formation aux compétences numériques de base pour les publics éloignés de l\'emploi.', budget: 48000, start_date: '2024-02-01', end_date: '2025-06-30' },
    { id: 12, project_call_id: 3, status_id: 10, title: 'Projet European Grant HorizonX', description: 'Coordination d\'un projet Horizon Europe multi-partenaires sur la transition écologique.', budget: 450000, start_date: '2025-09-01', end_date: '2028-08-31' },
    // Projets courts 2026 pour heatmap variée
    { id: 13, project_call_id: 1, status_id: 11, title: 'Audit interne S1 2026',             description: '', budget: 5000,  start_date: '2026-01-05', end_date: '2026-01-20' },
    { id: 14, project_call_id: 2, status_id: 10, title: 'Kick-off partenariat AlphaLab',     description: '', budget: 8000,  start_date: '2026-01-10', end_date: '2026-01-30' },
    { id: 15, project_call_id: 1, status_id: 11, title: 'Séminaire Axe 1 – Janvier',         description: '', budget: 3000,  start_date: '2026-01-18', end_date: '2026-01-25' },
    { id: 16, project_call_id: 3, status_id: 10, title: 'Colloque régional Sciences&Société', description: '', budget: 12000, start_date: '2026-03-03', end_date: '2026-03-07' },
    { id: 17, project_call_id: 4, status_id: 12, title: 'Sprint démonstrateur V2',            description: '', budget: 20000, start_date: '2026-03-09', end_date: '2026-03-28' },
    { id: 18, project_call_id: 2, status_id: 10, title: 'Revue mi-parcours HorizonX',         description: '', budget: 6000,  start_date: '2026-03-15', end_date: '2026-03-20' },
    { id: 19, project_call_id: 1, status_id: 11, title: 'Formation encadrants recherche',     description: '', budget: 9000,  start_date: '2026-03-22', end_date: '2026-04-04' },
    { id: 20, project_call_id: 2, status_id: 10, title: 'Atelier IA & données territoriales', description: '', budget: 4000,  start_date: '2026-03-24', end_date: '2026-03-31' },
    { id: 21, project_call_id: 3, status_id: 10, title: 'Mobilité entrante – Barcelone',      description: '', budget: 2500,  start_date: '2026-06-01', end_date: '2026-06-14' },
    { id: 22, project_call_id: 1, status_id: 11, title: 'Bilan annuel formation',             description: '', budget: 5000,  start_date: '2026-06-08', end_date: '2026-06-30' },
    { id: 23, project_call_id: 4, status_id: 12, title: 'Test pilote IoT – Phase 3',          description: '', budget: 18000, start_date: '2026-06-15', end_date: '2026-07-10' },
    { id: 24, project_call_id: 2, status_id: 10, title: 'Conférence internationale SIGIR',    description: '', budget: 3500,  start_date: '2026-09-07', end_date: '2026-09-12' },
    { id: 25, project_call_id: 3, status_id: 10, title: 'Rentrée scientifique 2026',          description: '', budget: 7000,  start_date: '2026-09-01', end_date: '2026-09-15' },
    { id: 26, project_call_id: 1, status_id: 11, title: 'AAP Automne – Instruction dossiers', description: '', budget: 4000,  start_date: '2026-09-14', end_date: '2026-10-09' },
    { id: 27, project_call_id: 4, status_id: 12, title: 'Séminaire transfert brevet',         description: '', budget: 6000,  start_date: '2026-09-21', end_date: '2026-09-30' },
    { id: 28, project_call_id: 2, status_id: 10, title: 'Hackathon Open Data',                description: '', budget: 5000,  start_date: '2026-09-25', end_date: '2026-10-02' },
    { id: 29, project_call_id: 1, status_id: 11, title: 'Clôture projets T4',                 description: '', budget: 3000,  start_date: '2026-11-02', end_date: '2026-11-20' },
    { id: 30, project_call_id: 3, status_id: 10, title: 'Bilan mobilités Europe',             description: '', budget: 4000,  start_date: '2026-11-09', end_date: '2026-11-27' },
    { id: 31, project_call_id: 4, status_id: 12, title: 'Rapport final Smart Campus',         description: '', budget: 8000,  start_date: '2026-11-16', end_date: '2026-12-05' },
]

export const mockFinancialAgreements: FinancialAgreement[] = [
    { id: 1, project_id: 1, partner_id: 2, axis_id: 1, status_id: 16, title: "Convention Entreprise A", description: "Accord de co-financement formation", budget: 45000, grant: 30000, signed_date: "2024-03-01", budget_detail_id: 11 },
    { id: 2, project_id: 2, partner_id: 3, axis_id: 2, status_id: 15, title: "Convention Association B", description: "Accord de partenariat recherche", budget: 60000, grant: 50000, signed_date: "2024-06-15", budget_detail_id: 15 },
    { id: 3, project_id: 3, partner_id: 4, axis_id: 3, status_id: 15, title: "Convention Institut Recherche", description: "Accord de cooperation internationale", budget: 30000, grant: 25000, signed_date: "2025-02-01", budget_detail_id: 15 },
    { id: 4, project_id: 4, partner_id: 6, axis_id: null, status_id: 14, title: "Convention Fondation E", description: "Subvention innovation et transfert", budget: 80000, grant: 70000, signed_date: "2025-07-01", budget_detail_id: 9 },
    { id: 5, project_id: 2, partner_id: 5, axis_id: 2, status_id: 15, title: "Convention Collectivite D", description: "Cofinancement recherche territoriale", budget: 20000, grant: 15000, signed_date: "2025-03-15", budget_detail_id: 14 },
    { id: 6, project_id: 5, partner_id: 1, axis_id: 2, status_id: 15, title: "Convention Universite X - Data", description: "Financement recherche data science territoriale", budget: 50000, grant: 40000, signed_date: "2025-06-01", budget_detail_id: 15 },
    { id: 7, project_id: 5, partner_id: 5, axis_id: 2, status_id: 15, title: "Convention Collectivite D - Data", description: "Reversement collectivite analyse territoriale", budget: 30000, grant: 20000, signed_date: "2025-07-15", budget_detail_id: null },
    { id: 8, project_id: 6, partner_id: 3, axis_id: 1, status_id: 14, title: "Convention Association B - Badges", description: "Partenariat certification open badges", budget: 20000, grant: 15000, signed_date: "", budget_detail_id: 11 },
    { id: 9, project_id: 7, partner_id: 4, axis_id: 2, status_id: 15, title: "Convention Institut - Biodiversite", description: "Financement etude biodiversite urbaine", budget: 35000, grant: 28000, signed_date: "2024-04-01", budget_detail_id: 15 },
    { id: 10, project_id: 7, partner_id: 5, axis_id: 2, status_id: 15, title: "Convention Collectivite D - Bio", description: "Reversement collectivite cartographie", budget: 22000, grant: 18000, signed_date: "2024-05-01", budget_detail_id: null },
    { id: 11, project_id: 8, partner_id: 4, axis_id: 3, status_id: 14, title: "Convention Institut - Cooperation Sud", description: "Convention cooperation internationale non signee", budget: 30000, grant: 22000, signed_date: "", budget_detail_id: 15 },
    { id: 12, project_id: 10, partner_id: 2, axis_id: 4, status_id: 15, title: "Convention Entreprise A - Smart Campus", description: "Partenariat deploiement IoT campus", budget: 60000, grant: 45000, signed_date: "2024-10-01", budget_detail_id: 13 },
    { id: 13, project_id: 12, partner_id: 1, axis_id: 3, status_id: 15, title: "Convention Universite X - HorizonX", description: "Subvention Horizon Europe", budget: 200000, grant: 180000, signed_date: "2025-09-15", budget_detail_id: 9 },
    { id: 14, project_id: 12, partner_id: 6, axis_id: 3, status_id: 14, title: "Convention Fondation E - HorizonX", description: "Reversement fondation non finalise", budget: 80000, grant: 60000, signed_date: "", budget_detail_id: null },
]

export const mockPhds: Phd[] = [
    { id: 1, member_id: 4, start_date: '2024-10-01', end_date: '2027-09-30', axis_id: 2 },
    { id: 2, member_id: 14, start_date: '2023-10-01', end_date: '2026-09-30', axis_id: 4 },
]

export const mockMobilityGrants: MobilityGrant[] = [
    { id: 1, member_id: 4, start_date: '2025-09-22', end_date: '2025-09-26', axis_id: 3 },
    { id: 2, member_id: 14, start_date: '2026-06-22', end_date: '2026-07-03', axis_id: 3 },
    { id: 3, member_id: 5, start_date: '2026-03-25', end_date: '2026-03-27', axis_id: 3 },
]

export const mockKpis: Kpi[] = [
    { id: 1, label: 'Nombre d\'étudiants sensibilisés', unit: 'étudiants', definition: 'Nombre total d\'étudiants ayant participé à une action de sensibilisation.', dimension: 'Formation' },
    { id: 2, label: 'Nombre de publications', unit: 'publications', definition: 'Nombre d\'articles ou actes publiés dans le cadre du projet.', dimension: 'Recherche' },
    { id: 3, label: 'Nombre de mobilités', unit: 'mobilités', definition: 'Nombre de mobilités sortantes financées.', dimension: 'International' },
    { id: 4, label: 'Nombre de brevets déposés', unit: 'brevets', definition: 'Nombre de dépôts de brevets issus des travaux du programme.', dimension: 'Innovation' },
    { id: 5, label: 'Taux d\'insertion professionnelle', unit: '%', definition: 'Taux d\'insertion des doctorants à 6 mois après soutenance.', dimension: 'Formation' },
]

export const mockKpiEntries: KpiEntry[] = [
    // Projet 1 — Formation Numérique
    { id: 1, project_id: 1, kpi_id: 1, member_id: 1, value: 120, comment: 'Séminaire de lancement', date: '2024-06-30', year: '2024', author_id: 1 },
    { id: 2, project_id: 1, kpi_id: 1, member_id: 1, value: 210, comment: 'Module sensibilisation L3', date: '2025-01-15', year: '2025', author_id: 1 },
    { id: 3, project_id: 1, kpi_id: 5, member_id: 3, value: 78, comment: 'Cohorte 2023', date: '2024-09-01', year: '2024', author_id: 3 },
    { id: 4, project_id: 1, kpi_id: 5, member_id: 3, value: 82, comment: 'Cohorte 2024', date: '2025-09-01', year: '2025', author_id: 3 },

    // Projet 2 — Recherche IA
    { id: 5, project_id: 2, kpi_id: 2, member_id: 2, value: 3, comment: 'Articles soumis T1 2025', date: '2025-03-31', year: '2025', author_id: 2 },
    { id: 6, project_id: 2, kpi_id: 2, member_id: 2, value: 5, comment: 'Publications acceptées T2', date: '2025-06-30', year: '2025', author_id: 2 },
    { id: 7, project_id: 2, kpi_id: 2, member_id: 12, value: 2, comment: 'Actes de colloque', date: '2026-02-05', year: '2026', author_id: 12 },

    // Projet 3 — Mobilités Europe
    { id: 8, project_id: 3, kpi_id: 3, member_id: 1, value: 4, comment: 'Mobilités sortantes S1 2025', date: '2025-06-30', year: '2025', author_id: 1 },
    { id: 9, project_id: 3, kpi_id: 3, member_id: 1, value: 7, comment: 'Mobilités sortantes S2 2025', date: '2025-12-31', year: '2025', author_id: 1 },
    { id: 10, project_id: 3, kpi_id: 3, member_id: 5, value: 3, comment: 'Mobilités sortantes S1 2026', date: '2026-06-30', year: '2026', author_id: 5 },

    // Projet 4 — Transfert Technologique
    { id: 11, project_id: 4, kpi_id: 4, member_id: 2, value: 1, comment: 'Brevet procédé de traitement', date: '2026-03-15', year: '2026', author_id: 2 },
    { id: 12, project_id: 4, kpi_id: 4, member_id: 13, value: 1, comment: 'Brevet matériau composite', date: '2026-05-20', year: '2026', author_id: 13 },
]

export const mockBudgetCategories: BudgetCategory[] = [
    { id: 1, partner_id: null, title: "Personnel" },
    { id: 2, partner_id: null, title: "Equipement" },
    { id: 3, partner_id: null, title: "Fonctionnement" },
]

export const mockBudgetDetails: BudgetDetail[] = [
    // ── Groupes parents (pas de budget ni de dates propres) ──
    { id: 1, budget_category_id: 1, parent_id: null, title: "Postdoctorants", description: "", budget: 0, start_date: null, end_date: null },
    { id: 2, budget_category_id: 1, parent_id: null, title: "Ingenieurs de recherche", description: "", budget: 0, start_date: null, end_date: null },
    { id: 3, budget_category_id: 1, parent_id: null, title: "Formation", description: "", budget: 0, start_date: null, end_date: null },
    { id: 4, budget_category_id: 2, parent_id: null, title: "Materiel informatique", description: "", budget: 0, start_date: null, end_date: null },
    { id: 5, budget_category_id: 2, parent_id: null, title: "Equipement electronique", description: "", budget: 0, start_date: null, end_date: null },
    { id: 6, budget_category_id: 3, parent_id: null, title: "Missions", description: "", budget: 0, start_date: null, end_date: null },
    { id: 7, budget_category_id: 3, parent_id: null, title: "Prestations externes", description: "", budget: 0, start_date: null, end_date: null },
    { id: 8, budget_category_id: 3, parent_id: null, title: "Facturation interne", description: "", budget: 0, start_date: null, end_date: null },
    // ── Lignes enfants (portent budget + période) ──
    { id: 9, budget_category_id: 1, parent_id: 1, title: "Contrat postdoc - traitement du signal", description: "Postdoctorant en IA embarquee", budget: 187000, start_date: "2023-03-01", end_date: "2025-12-31" },
    { id: 10, budget_category_id: 1, parent_id: 2, title: "Ingenieur de recherche logiciel embarque", description: "Developpement firmware et middleware", budget: 140000, start_date: "2023-03-01", end_date: "2025-06-30" },
    { id: 11, budget_category_id: 1, parent_id: 3, title: "Formations certifiantes", description: "Formations et accompagnement divers", budget: 30000, start_date: null, end_date: null },
    { id: 12, budget_category_id: 2, parent_id: 4, title: "Serveurs et stations de travail", description: "HPC, GPU, NAS et postes de travail", budget: 90000, start_date: "2023-03-01", end_date: "2024-12-31" },
    { id: 13, budget_category_id: 2, parent_id: 5, title: "Cartes de developpement et composants", description: "FPGA, microcontroleurs, capteurs", budget: 45000, start_date: "2023-05-01", end_date: "2025-12-31" },
    { id: 14, budget_category_id: 3, parent_id: 6, title: "Deplacements conferences", description: "Frais de deplacement et hebergement", budget: 25000, start_date: null, end_date: null },
    { id: 15, budget_category_id: 3, parent_id: 7, title: "Developpement plateforme IoT", description: "Sprint de developpement logiciel embarque", budget: 65000, start_date: "2023-11-01", end_date: "2026-02-28" },
    { id: 16, budget_category_id: 3, parent_id: 7, title: "Valorisation et transfert technologique", description: "Brevet et licences technologiques", budget: 12000, start_date: "2024-07-01", end_date: "2024-09-30" },
    { id: 17, budget_category_id: 3, parent_id: 7, title: "Conseil et audit innovation", description: "Prestations de conseil strategique", budget: 15000, start_date: "2023-10-01", end_date: "2023-11-30" },
    { id: 18, budget_category_id: 3, parent_id: 7, title: "Licences logicielles", description: "Logiciels de simulation et de CAO", budget: 12000, start_date: null, end_date: null },
    { id: 19, budget_category_id: 3, parent_id: 8, title: "Facturation LIRMM mutualisee", description: "Utilisation equipements et plateformes", budget: 20000, start_date: null, end_date: null },
]

export const mockToDoLists: ToDoList[] = [
    { id: 1, action_card_id: 1, title: 'Préparation logistique' },
    { id: 2, action_card_id: 4, title: 'Rédaction rapport' },
    { id: 3, action_card_id: 26, title: 'Organisation formation' },
    { id: 4, action_card_id: 31, title: 'Préparation comité' },
]

export const mockToDoItems: ToDoItem[] = [
    { id: 1, list_id: 1, content: 'Réserver la salle', status_id: 9, start_date: '2025-08-01', end_time: '2025-08-15', due_date: '2025-08-10' },
    { id: 2, list_id: 1, content: 'Envoyer les invitations', status_id: 9, start_date: '2025-08-15', end_time: '2025-08-30', due_date: '2025-08-25' },
    { id: 3, list_id: 2, content: 'Collecter les indicateurs', status_id: 9, start_date: '2025-06-01', end_time: '2025-06-15', due_date: '' },
    { id: 4, list_id: 2, content: 'Rédiger la synthèse', status_id: 9, start_date: '2025-06-15', end_time: '2025-06-25', due_date: '' },
    { id: 5, list_id: 3, content: 'Préparer les supports', status_id: 8, start_date: '2026-04-25', end_time: '2026-05-01', due_date: '2026-04-30' },
    { id: 6, list_id: 3, content: 'Inviter les participants', status_id: 8, start_date: '2026-04-28', end_time: '2026-05-05', due_date: '' },
    { id: 7, list_id: 4, content: 'Envoyer l\'ordre du jour', status_id: 8, start_date: '2026-05-28', end_time: '2026-06-01', due_date: '2026-05-30' },
    { id: 8, list_id: 4, content: 'Préparer les indicateurs', status_id: 8, start_date: '2026-05-28', end_time: '2026-06-04', due_date: '' },
]

export const mockMemberActionCards: MemberActionCard[] = [
    // Carte 1
    { id: 1, member_id: 1, action_card_id: 1, role: 'Responsable' },
    { id: 2, member_id: 2, action_card_id: 1, role: 'Contributeur' },
    { id: 3, member_id: 3, action_card_id: 1, role: 'Observateur' },
    // Carte 5
    { id: 4, member_id: 2, action_card_id: 5, role: 'Responsable' },
    { id: 5, member_id: 12, action_card_id: 5, role: 'Contributeur' },
    // Carte 8
    { id: 6, member_id: 4, action_card_id: 8, role: 'Responsable' },
    // Carte 9
    { id: 7, member_id: 2, action_card_id: 9, role: 'Responsable' },
    { id: 8, member_id: 4, action_card_id: 9, role: 'Contributeur' },
    // Carte 10
    { id: 9, member_id: 3, action_card_id: 10, role: 'Responsable' },
    // Carte 13
    { id: 10, member_id: 6, action_card_id: 13, role: 'Responsable' },
    { id: 11, member_id: 8, action_card_id: 13, role: 'Contributeur' },
    { id: 12, member_id: 2, action_card_id: 13, role: 'Observateur' },
    // Carte 14
    { id: 13, member_id: 12, action_card_id: 14, role: 'Responsable' },
    { id: 14, member_id: 13, action_card_id: 14, role: 'Contributeur' },
    // Carte 18
    { id: 15, member_id: 14, action_card_id: 18, role: 'Responsable' },
    { id: 16, member_id: 12, action_card_id: 18, role: 'Contributeur' },
    { id: 17, member_id: 5, action_card_id: 18, role: 'Observateur' },
    // Carte 20
    { id: 18, member_id: 7, action_card_id: 20, role: 'Responsable' },
    { id: 19, member_id: 12, action_card_id: 20, role: 'Contributeur' },
    // Carte 23
    { id: 20, member_id: 15, action_card_id: 23, role: 'Responsable' },
    { id: 21, member_id: 16, action_card_id: 23, role: 'Contributeur' },
    { id: 22, member_id: 1, action_card_id: 23, role: 'Observateur' },
    // Carte 26
    { id: 23, member_id: 1, action_card_id: 26, role: 'Responsable' },
    { id: 24, member_id: 5, action_card_id: 26, role: 'Contributeur' },
    { id: 25, member_id: 10, action_card_id: 26, role: 'Observateur' },
    // Carte 27
    { id: 26, member_id: 12, action_card_id: 27, role: 'Responsable' },
    { id: 27, member_id: 13, action_card_id: 27, role: 'Contributeur' },
    // Carte 28
    { id: 28, member_id: 6, action_card_id: 28, role: 'Responsable' },
    { id: 29, member_id: 8, action_card_id: 28, role: 'Contributeur' },
    // Carte 32
    { id: 30, member_id: 4, action_card_id: 32, role: 'Responsable' },
    { id: 31, member_id: 14, action_card_id: 32, role: 'Contributeur' },
    { id: 32, member_id: 9, action_card_id: 32, role: 'Observateur' },
    // Multi-responsables pour tester le +N
    { id: 33, member_id: 3, action_card_id: 1, role: 'Responsable' },
    { id: 34, member_id: 5, action_card_id: 1, role: 'Responsable' },
    { id: 35, member_id: 4, action_card_id: 9, role: 'Responsable' },
    { id: 36, member_id: 12, action_card_id: 9, role: 'Responsable' },
    { id: 37, member_id: 2, action_card_id: 13, role: 'Responsable' },
    // Participants avec statut de participation (carte 1 = Séminaire de lancement)
    { id: 38, member_id: 6,  action_card_id: 1, role: 'Participant', participation_status_id: 20 },
    { id: 39, member_id: 7,  action_card_id: 1, role: 'Participant', participation_status_id: 19 },
    { id: 40, member_id: 8,  action_card_id: 1, role: 'Participant', participation_status_id: 21 },
    { id: 41, member_id: 9,  action_card_id: 1, role: 'Participant', participation_status_id: 18 },
    { id: 42, member_id: 10, action_card_id: 1, role: 'Participant', participation_status_id: 22 },
    // Participants carte 7 = Réunion comité de pilotage
    { id: 43, member_id: 4,  action_card_id: 7, role: 'Participant', participation_status_id: 19 },
    { id: 44, member_id: 5,  action_card_id: 7, role: 'Participant', participation_status_id: 18 },
    { id: 45, member_id: 11, action_card_id: 7, role: 'Participant' },
]

export const mockAxisActionCards: AxisActionCard[] = [
    { id: 1, axis_id: 1, action_card_id: 1 },
    { id: 2, axis_id: 1, action_card_id: 2 },
    { id: 3, axis_id: 1, action_card_id: 3 },
    { id: 4, axis_id: 2, action_card_id: 4 },
    { id: 5, axis_id: 2, action_card_id: 5 },
    { id: 6, axis_id: 2, action_card_id: 9 },
    { id: 7, axis_id: 3, action_card_id: 8 },
    { id: 8, axis_id: 1, action_card_id: 7 },
    { id: 9, axis_id: 2, action_card_id: 10 },
    { id: 10, axis_id: 2, action_card_id: 11 },
    { id: 11, axis_id: 4, action_card_id: 13 },
    { id: 12, axis_id: 2, action_card_id: 14 },
    { id: 13, axis_id: 3, action_card_id: 15 },
    { id: 14, axis_id: 1, action_card_id: 17 },
    { id: 15, axis_id: 2, action_card_id: 18 },
    { id: 16, axis_id: 4, action_card_id: 18 },
    { id: 17, axis_id: 3, action_card_id: 20 },
    { id: 18, axis_id: 2, action_card_id: 21 },
    { id: 19, axis_id: 4, action_card_id: 21 },
    { id: 20, axis_id: 3, action_card_id: 23 },
    { id: 21, axis_id: 1, action_card_id: 26 },
    { id: 22, axis_id: 2, action_card_id: 27 },
    { id: 23, axis_id: 4, action_card_id: 28 },
    { id: 24, axis_id: 1, action_card_id: 30 },
    { id: 25, axis_id: 2, action_card_id: 34 },
    { id: 26, axis_id: 3, action_card_id: 32 },
    { id: 27, axis_id: 1, action_card_id: 36 },
    { id: 28, axis_id: 3, action_card_id: 37 },
    { id: 29, axis_id: 1, action_card_id: 38 },
    { id: 30, axis_id: 2, action_card_id: 42 },
]

export const mockProjectActionCards: ProjectActionCard[] = [
    { id: 1, project_id: 1, action_card_id: 1 },
    { id: 2, project_id: 1, action_card_id: 2 },
    { id: 3, project_id: 2, action_card_id: 5 },
    { id: 4, project_id: 2, action_card_id: 9 },
    { id: 5, project_id: 4, action_card_id: 13 },
    { id: 6, project_id: 2, action_card_id: 14 },
    { id: 7, project_id: 3, action_card_id: 8 },
    { id: 8, project_id: 4, action_card_id: 28 },
    { id: 9, project_id: 2, action_card_id: 27 },
    { id: 10, project_id: 3, action_card_id: 32 },
]

export const mockAgreementActionCards: AgreementActionCard[] = [
    { id: 1, financial_agreement_id: 1, action_card_id: 1 },
    { id: 2, financial_agreement_id: 1, action_card_id: 2 },
    { id: 3, financial_agreement_id: 2, action_card_id: 5 },
    { id: 4, financial_agreement_id: 2, action_card_id: 14 },
    { id: 5, financial_agreement_id: 3, action_card_id: 8 },
    { id: 6, financial_agreement_id: 4, action_card_id: 13 },
    { id: 7, financial_agreement_id: 4, action_card_id: 28 },
    { id: 8, financial_agreement_id: 5, action_card_id: 9 },
]

export const mockComments: Comment[] = [
    // Carte 1 — commentaires racine + réponses
    { id: 1, owner_id: 1, action_card_id: 1, content: 'Le séminaire est confirmé pour le 3 septembre, salle A12.', timestamp: '2025-08-20T09:15:00' },
    { id: 2, owner_id: 2, action_card_id: 1, parent_comment_id: 1, content: 'Parfait, je préviens les intervenants.', timestamp: '2025-08-20T10:02:00' },
    { id: 3, owner_id: 3, action_card_id: 1, parent_comment_id: 1, content: 'J\'envoie les invitations cette semaine.', timestamp: '2025-08-20T11:30:00' },
    { id: 4, owner_id: 1, action_card_id: 1, content: 'Penser à réserver le matériel de projection.', timestamp: '2025-08-21T08:45:00' },
    { id: 5, owner_id: 4, action_card_id: 1, parent_comment_id: 4, content: 'C\'est déjà réservé, j\'ai confirmé avec la logistique.', timestamp: '2025-08-21T09:10:00' },

    // Carte 2
    { id: 6, owner_id: 2, action_card_id: 2, content: 'Le module est prêt à 80%, il manque la partie évaluation.', timestamp: '2025-10-05T14:00:00' },
    { id: 7, owner_id: 5, action_card_id: 2, parent_comment_id: 6, content: 'Je m\'en charge cette semaine.', timestamp: '2025-10-06T09:30:00' },
    { id: 8, owner_id: 2, action_card_id: 2, content: 'Pensez à valider avec la direction pédagogique avant diffusion.', timestamp: '2025-10-07T16:00:00' },

    // Carte 9 — thèse en cours
    { id: 9, owner_id: 2, action_card_id: 9, content: 'Réunion de suivi prévue mi-novembre, à confirmer avec le co-directeur.', timestamp: '2025-10-15T10:00:00' },
    { id: 10, owner_id: 4, action_card_id: 9, parent_comment_id: 9, content: 'Le professeur Müller est disponible le 18 novembre.', timestamp: '2025-10-15T11:45:00' },
    { id: 11, owner_id: 2, action_card_id: 9, parent_comment_id: 10, content: 'Noté, je bloque la date.', timestamp: '2025-10-15T12:00:00' },

    // Carte 14
    { id: 12, owner_id: 12, action_card_id: 14, content: 'Première version de l\'article envoyée aux co-auteurs pour relecture.', timestamp: '2025-10-20T08:00:00' },
    { id: 13, owner_id: 13, action_card_id: 14, parent_comment_id: 12, content: 'Commentaires envoyés par mail, quelques ajustements sur la méthodologie.', timestamp: '2025-10-22T17:30:00' },
]

export const mockProjectMembers: ProjectMember[] = [
    // Projet 1 — Formation Numérique
    { id: 1, project_id: 1, member_id: 1, role: 'Lead' },
    { id: 2, project_id: 1, member_id: 3, role: 'Equipe' },
    { id: 3, project_id: 1, member_id: 7, role: 'Partenaire' },
    // Projet 2 — Recherche IA
    { id: 4, project_id: 2, member_id: 2, role: 'Lead' },
    { id: 5, project_id: 2, member_id: 5, role: 'Equipe' },
    { id: 6, project_id: 2, member_id: 6, role: 'Partenaire' },
    { id: 7, project_id: 2, member_id: 4, role: 'Observateur' },
    // Projet 3 — Mobilités Europe
    { id: 8, project_id: 3, member_id: 1, role: 'Lead' },
    { id: 9, project_id: 3, member_id: 5, role: 'Equipe' },
    // Projet 4 — Transfert Technologique
    { id: 10, project_id: 4, member_id: 2, role: 'Lead' },
    { id: 11, project_id: 4, member_id: 6, role: 'Partenaire' },
    { id: 12, project_id: 4, member_id: 7, role: 'Equipe' },
    // Projet 5 — Data Science Territoires
    { id: 13, project_id: 5, member_id: 12, role: 'Lead' },
    { id: 14, project_id: 5, member_id: 13, role: 'Equipe' },
    { id: 15, project_id: 5, member_id: 16, role: 'Partenaire' },
    // Projet 6 — Open Badges (sans lead pour test)
    { id: 16, project_id: 6, member_id: 9, role: 'Equipe' },
    // Projet 7 — Biodiversité Urbaine
    { id: 17, project_id: 7, member_id: 12, role: 'Lead' },
    { id: 18, project_id: 7, member_id: 15, role: 'Partenaire' },
    { id: 19, project_id: 7, member_id: 14, role: 'Equipe' },
    // Projet 8 — Coopération Sud
    { id: 20, project_id: 8, member_id: 1, role: 'Lead' },
    { id: 21, project_id: 8, member_id: 17, role: 'Partenaire' },
    // Projet 9 — Hydrogène Vert : aucun membre → alerte
    // Projet 10 — Smart Campus
    { id: 22, project_id: 10, member_id: 6, role: 'Lead' },
    { id: 23, project_id: 10, member_id: 8, role: 'Equipe' },
    { id: 24, project_id: 10, member_id: 2, role: 'Observateur' },
    // Projet 11 — Inclusion Numérique
    { id: 25, project_id: 11, member_id: 9, role: 'Lead' },
    { id: 26, project_id: 11, member_id: 10, role: 'Equipe' },
    // Projet 12 — HorizonX
    { id: 27, project_id: 12, member_id: 1, role: 'Lead' },
    { id: 28, project_id: 12, member_id: 2, role: 'Equipe' },
    { id: 29, project_id: 12, member_id: 5, role: 'Equipe' },
    { id: 30, project_id: 12, member_id: 12, role: 'Partenaire' },
    { id: 31, project_id: 12, member_id: 17, role: 'Partenaire' },
    // Projet 1 — Participants (pour test suivi de participation)
    { id: 32, project_id: 1, member_id: 6,  role: 'Participant', participation_status_id: 20 },
    { id: 33, project_id: 1, member_id: 8,  role: 'Participant', participation_status_id: 19 },
    { id: 34, project_id: 1, member_id: 9,  role: 'Participant' },
    { id: 35, project_id: 1, member_id: 10, role: 'Participant', participation_status_id: 21 },
]

export const mockAgreementMembers: AgreementMember[] = [
    // Convention 1 — Entreprise A (projet 1)
    { id: 1, agreement_id: 1, member_id: 1 }, // Marie Dupont
    { id: 2, agreement_id: 1, member_id: 7 }, // Isabelle Petit
    // Convention 2 — Association B (projet 2)
    { id: 3, agreement_id: 2, member_id: 2 }, // Thomas Martin
    { id: 4, agreement_id: 2, member_id: 5 }, // Sophie Girard
    // Convention 3 — Institut Recherche (projet 3)
    { id: 5, agreement_id: 3, member_id: 1 }, // Marie Dupont
    // Convention 4 — Fondation E (projet 4)
    { id: 6, agreement_id: 4, member_id: 6 }, // Julien Moreau
    { id: 7, agreement_id: 4, member_id: 2 }, // Thomas Martin
    // Convention 5 — Collectivité D (projet 2)
    { id: 8, agreement_id: 5, member_id: 5 }, // Sophie Girard
]

export const mockProjectPartners: ProjectPartner[] = [
    // Projet 1 – Formation Numérique
    { id: 1, project_id: 1, partner_id: 1, role: 'Bénéficiaire', amount: null, label: null },
    { id: 2, project_id: 1, partner_id: 5, role: 'Cofinanceur', amount: 20000, label: 'Apport en numéraire' },
    { id: 3, project_id: 1, partner_id: 7, role: 'Associé', amount: null, label: null },
    { id: 4, project_id: 1, partner_id: 12, role: 'Associé', amount: null, label: null },

    // Projet 2 – Recherche IA
    { id: 5, project_id: 2, partner_id: 1, role: 'Bénéficiaire', amount: null, label: null },
    { id: 6, project_id: 2, partner_id: 2, role: 'Cofinanceur', amount: 30000, label: 'Apport en numéraire' },
    { id: 7, project_id: 2, partner_id: 4, role: 'Associé', amount: null, label: null },
    { id: 8, project_id: 2, partner_id: 7, role: 'Associé', amount: null, label: null },
    { id: 9, project_id: 2, partner_id: 8, role: 'Cofinanceur', amount: 15000, label: 'Apport en nature' },

    // Projet 3 – Mobilités Europe
    { id: 10, project_id: 3, partner_id: 1, role: 'Bénéficiaire', amount: null, label: null },
    { id: 11, project_id: 3, partner_id: 5, role: 'Cofinanceur', amount: 15000, label: 'Apport en nature' },
    { id: 12, project_id: 3, partner_id: 12, role: 'Associé', amount: null, label: null },
    { id: 13, project_id: 3, partner_id: 14, role: 'Associé', amount: null, label: null },

    // Projet 4 – Transfert Technologique
    { id: 14, project_id: 4, partner_id: 2, role: 'Bénéficiaire', amount: null, label: null },
    { id: 15, project_id: 4, partner_id: 1, role: 'Associé', amount: null, label: null },
    { id: 16, project_id: 4, partner_id: 8, role: 'Cofinanceur', amount: 25000, label: 'Apport en numéraire' },
    { id: 17, project_id: 4, partner_id: 9, role: 'Associé', amount: null, label: null },
    { id: 18, project_id: 4, partner_id: 12, role: 'Associé', amount: null, label: null },

    // Projet 5 – Data Science Territoires
    { id: 19, project_id: 5, partner_id: 1, role: 'Bénéficiaire', amount: null, label: null },
    { id: 20, project_id: 5, partner_id: 5, role: 'Cofinanceur', amount: 20000, label: 'Apport en numéraire' },
    { id: 21, project_id: 5, partner_id: 7, role: 'Associé', amount: null, label: null },
    { id: 22, project_id: 5, partner_id: 10, role: 'Associé', amount: null, label: null },
    { id: 23, project_id: 5, partner_id: 11, role: 'Cofinanceur', amount: 10000, label: 'Apport en nature' },

    // Projet 6 – Open Badges
    { id: 24, project_id: 6, partner_id: 3, role: 'Associé', amount: null, label: null },
    { id: 25, project_id: 6, partner_id: 7, role: 'Bénéficiaire', amount: null, label: null },
    { id: 26, project_id: 6, partner_id: 12, role: 'Associé', amount: null, label: null },

    // Projet 7 – Biodiversité Urbaine
    { id: 27, project_id: 7, partner_id: 4, role: 'Bénéficiaire', amount: null, label: null },
    { id: 28, project_id: 7, partner_id: 5, role: 'Cofinanceur', amount: 18000, label: 'Apport en numéraire' },
    { id: 29, project_id: 7, partner_id: 9, role: 'Associé', amount: null, label: null },
    { id: 30, project_id: 7, partner_id: 10, role: 'Associé', amount: null, label: null },
    { id: 31, project_id: 7, partner_id: 11, role: 'Cofinanceur', amount: 12000, label: 'Apport en nature' },

    // Projet 8 – Coopération Sud
    { id: 32, project_id: 8, partner_id: 1, role: 'Bénéficiaire', amount: null, label: null },
    { id: 33, project_id: 8, partner_id: 4, role: 'Associé', amount: null, label: null },
    { id: 34, project_id: 8, partner_id: 14, role: 'Associé', amount: null, label: null },

    // Projet 9 – Hydrogène Vert
    { id: 35, project_id: 9, partner_id: 2, role: 'Bénéficiaire', amount: null, label: null },
    { id: 36, project_id: 9, partner_id: 8, role: 'Associé', amount: null, label: null },
    { id: 37, project_id: 9, partner_id: 9, role: 'Associé', amount: null, label: null },
    { id: 38, project_id: 9, partner_id: 6, role: 'Cofinanceur', amount: 40000, label: 'Subvention' },

    // Projet 10 – Smart Campus
    { id: 39, project_id: 10, partner_id: 2, role: 'Bénéficiaire', amount: null, label: null },
    { id: 40, project_id: 10, partner_id: 8, role: 'Associé', amount: null, label: null },
    { id: 41, project_id: 10, partner_id: 7, role: 'Associé', amount: null, label: null },
    { id: 42, project_id: 10, partner_id: 11, role: 'Cofinanceur', amount: 15000, label: 'Apport en numéraire' },

    // Projet 11 – Inclusion Numérique
    { id: 43, project_id: 11, partner_id: 3, role: 'Bénéficiaire', amount: null, label: null },
    { id: 44, project_id: 11, partner_id: 10, role: 'Cofinanceur', amount: 8000, label: 'Apport en nature' },
    { id: 45, project_id: 11, partner_id: 11, role: 'Associé', amount: null, label: null },
    { id: 46, project_id: 11, partner_id: 14, role: 'Associé', amount: null, label: null },

    // Projet 12 – European Grant HorizonX
    { id: 47, project_id: 12, partner_id: 1, role: 'Coordinateur', amount: null, label: null },
    { id: 48, project_id: 12, partner_id: 4, role: 'Associé', amount: null, label: null },
    { id: 49, project_id: 12, partner_id: 6, role: 'Cofinanceur', amount: 60000, label: 'Subvention' },
    { id: 50, project_id: 12, partner_id: 7, role: 'Associé', amount: null, label: null },
    { id: 51, project_id: 12, partner_id: 12, role: 'Associé', amount: null, label: null },
    { id: 52, project_id: 12, partner_id: 13, role: 'Associé', amount: null, label: null },
]

export const mockProjectMilestones: ProjectMilestone[] = [
    // Projet 1 – Formation Numérique
    { id: 1, project_id: 1, title: 'Lancement du projet', description: 'Réunion de démarrage et validation du plan de travail', due_date: '2024-02-01', status_id: 3 },
    { id: 2, project_id: 1, title: 'Livraison module pilote', description: 'Premier module pédagogique livré et testé', due_date: '2024-09-01', status_id: 3 },
    { id: 3, project_id: 1, title: 'Évaluation finale', description: 'Bilan et rapport de clôture', due_date: '2025-11-01', status_id: 3 },

    // Projet 2 – Recherche IA
    { id: 4, project_id: 2, title: 'Revue de littérature', description: 'État de l\'art sur l\'IA appliquée à l\'analyse de données', due_date: '2024-09-01', status_id: 3 },
    { id: 5, project_id: 2, title: 'Prototype v1', description: 'Premier prototype fonctionnel de l\'outil d\'analyse', due_date: '2025-03-01', status_id: 1 },
    { id: 6, project_id: 2, title: 'Publication des résultats', description: 'Soumission d\'un article dans une revue indexée', due_date: '2025-12-01', status_id: 2 },

    // Projet 3 – Mobilités Europe
    { id: 7, project_id: 3, title: 'Sélection des candidats', description: 'Appel à candidatures et sélection des mobilités', due_date: '2025-03-01', status_id: 3 },
    { id: 8, project_id: 3, title: 'Départ première vague', description: 'Départ des premiers chercheurs sélectionnés', due_date: '2025-06-01', status_id: 1 },
    { id: 9, project_id: 3, title: 'Rapport intermédiaire', description: 'Bilan mi-parcours des mobilités réalisées', due_date: '2026-01-01', status_id: 2 },

    // Projet 4 – Transfert Technologique
    { id: 10, project_id: 4, title: 'Audit des brevets', description: 'Identification et valorisation des brevets existants', due_date: '2025-06-01', status_id: 1 },
    { id: 11, project_id: 4, title: 'Accord de licence signé', description: 'Signature d\'un accord de licence avec partenaire industriel', due_date: '2026-01-01', status_id: 2 },
    { id: 12, project_id: 4, title: 'Clôture et bilan', description: 'Rapport final et évaluation de l\'impact du transfert', due_date: '2027-01-01', status_id: 2 },
]

export const mockTimeEntry: TimeEntry[] = [
    // Projet 1 — Formation Numérique
    { id: 1, project_id: 1, member_id: 1, days: 20, start_date: '2024-01-01', end_date: '2024-06-30' }, // Marie Dupont
    { id: 2, project_id: 1, member_id: 3, days: 10, start_date: '2024-01-01', end_date: '2024-06-30' }, // Claire Bernard
    { id: 3, project_id: 1, member_id: 7, days: 8, start_date: '2024-07-01', end_date: '2024-12-31' }, // Isabelle Petit
    { id: 4, project_id: 1, member_id: 1, days: 15, start_date: '2025-01-01', end_date: '2025-06-30' }, // Marie Dupont (2e période)
    // Projet 2 — Recherche IA
    { id: 5, project_id: 2, member_id: 2, days: 30, start_date: '2024-06-01', end_date: '2024-12-31' }, // Thomas Martin
    { id: 6, project_id: 2, member_id: 5, days: 25, start_date: '2024-06-01', end_date: '2024-12-31' }, // Sophie Girard
    { id: 7, project_id: 2, member_id: 6, days: 12, start_date: '2024-09-01', end_date: '2025-02-28' }, // Julien Moreau
    { id: 8, project_id: 2, member_id: 4, days: 5, start_date: '2025-01-01', end_date: '2025-06-30' }, // Antoine Leroy
    // Projet 3 — Mobilités Europe
    { id: 9, project_id: 3, member_id: 1, days: 10, start_date: '2025-01-01', end_date: '2025-06-30' }, // Marie Dupont
    { id: 10, project_id: 3, member_id: 5, days: 8, start_date: '2025-03-01', end_date: '2025-09-30' }, // Sophie Girard
    // Projet 4 — Transfert Technologique
    { id: 11, project_id: 4, member_id: 2, days: 20, start_date: '2025-03-01', end_date: '2025-09-30' }, // Thomas Martin
    { id: 12, project_id: 4, member_id: 6, days: 18, start_date: '2025-03-01', end_date: '2025-09-30' }, // Julien Moreau
    { id: 13, project_id: 4, member_id: 7, days: 10, start_date: '2025-06-01', end_date: '2025-12-31' }, // Isabelle Petit
]

export const mockFormations: Formation[] = [
    { id: 1, code: 'RNCP42270', type: 'RNCP', title: 'Licence Professionnelle - Domotique', partner_id: 1, level: 'Niveau 6', degree_type: 'Licence Professionnelle', formacode: '201 : Technologies de commandes, 255 : Electricite, électronique', rome: 'H1208 : Automatisme, I1302 : Maintenance automatismes', nsf: '22499 : Immotique', status: 'Active', expiry_date: '2031-08-31', is_national: true },
    { id: 2, code: 'RNCP38654', type: 'RNCP', title: 'Master Informatique - Intelligence Artificielle', partner_id: 1, level: 'Niveau 7', degree_type: 'Master', formacode: '326 : Informatique, traitement de l\'information', rome: 'M1805 : Études et développement informatique', nsf: '326 : Informatique', status: 'Active', expiry_date: '2029-12-31', is_national: false },
    { id: 3, code: 'RNCP35587', type: 'RNCP', title: 'BUT Réseaux et Télécommunications', partner_id: null, level: 'Niveau 5', degree_type: 'BUT', formacode: '255 : Electricite, électronique, 326 : Informatique', rome: 'I1302 : Maintenance télécoms, I1307 : Courants faibles', nsf: '255 : Electronique', status: 'Active', expiry_date: '2028-06-30', is_national: true },
    { id: 4, code: 'RNCP40123', type: 'RNCP', title: 'Licence Sciences de l\'Éducation', partner_id: 1, level: 'Niveau 6', degree_type: 'Licence', formacode: '333 : Enseignement, formation pédagogique', rome: 'K2104 : Éducation et surveillance', nsf: '333 : Enseignement', status: 'Active', expiry_date: '2030-06-30', is_national: false },
]

export const mockProjectFormations: ProjectFormation[] = [
    { id: 1, project_id: 1, formation_id: 1 },
    { id: 2, project_id: 1, formation_id: 4 },
    { id: 3, project_id: 2, formation_id: 2 },
    { id: 4, project_id: 3, formation_id: 3 },
]

export const mockProjectAttachments: ProjectAttachment[] = [
    { id: 1, project_id: 1, label: 'Convention signée', url: 'https://drive.google.com/file/example1' },
    { id: 2, project_id: 1, label: 'Rapport intermédiaire T1', url: 'https://drive.google.com/file/example2' },
    { id: 3, project_id: 2, label: 'Cahier des charges', url: 'https://drive.google.com/file/example3' },
]

export const mockProgram: Program[] = [
    { id: 1, name: "Iris-E", budget: 20000000, start_date: "2023-01-01", end_date: "2032-12-31", description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut varius diam quis commodo euismod. Nulla facilisi. Nulla facilisi. Vestibulum nibh turpis, viverra eget sapien sit amet, euismod venenatis neque. Nunc dictum dolor id augue varius accumsan. Integer vestibulum a urna sit amet aliquam.", logo: "", management_fee_rate: 8 }
]

// `sifac_code` volontairement vide sur une partie des fiches : ce sont les
// fournisseurs saisis à la main avant l'arrivée de SIFAC. Ils permettent de
// tester l'amorçage (rapprochement sur le nom) et la création automatique.
export const mockSuppliers: Supplier[] = [
    { id: 1, name: "Dell Technologies France", description: "Materiel informatique professionnel", siret: "34213797800085", sifac_code: "102345" },
    { id: 2, name: "Nvidia Corporation", description: "GPU et solutions HPC", siret: "00000000000000", sifac_code: "109187" },
    { id: 3, name: "Arrow Electronics", description: "Composants electroniques et distribution", siret: "30178873000019", sifac_code: "" },
    { id: 4, name: "Altair Engineering", description: "Logiciels de simulation", siret: "38319462200041", sifac_code: "115024" },
    { id: 5, name: "Thales Training", description: "Formations techniques avancees", siret: "32258800800021", sifac_code: "120776" },
    { id: 6, name: "SNCF Voyageurs", description: "Transport ferroviaire", siret: "51940670700021", sifac_code: "" },
    { id: 7, name: "Air France", description: "Transport aerien", siret: "42004016400642", sifac_code: "128441" },
    { id: 8, name: "Booking Holdings", description: "Reservations hoteliers", siret: "00000000000002", sifac_code: "" },
    { id: 9, name: "Optika Conseil", description: "Prestations de conseil en innovation", siret: "82345678900013", sifac_code: "" },
    { id: 10, name: "Pytheas Informatique", description: "Developpement logiciel sur mesure", siret: "78234567800024", sifac_code: "134612" },
    { id: 11, name: "CEA Tech Transfert", description: "Valorisation et transfert technologique", siret: "77568979800034", sifac_code: "" },
    { id: 12, name: "Atos SE", description: "Infrastructure IT et cloud", siret: "32348625600059", sifac_code: "139053" },
    { id: 13, name: "Bertin Technologies", description: "Instrumentation scientifique", siret: "38190032200072", sifac_code: "" },
    { id: 14, name: "CNRS Formation Entreprises", description: "Formations scientifiques et techniques", siret: "18000001100019", sifac_code: "142208" },
    { id: 15, name: "Expensya SAS", description: "Gestion des notes de frais", siret: "81234567900015", sifac_code: "" },
    // Correspond au supplier_code "28332" de mockSifacLines : c'est le fournisseur
    // qui doit être retrouvé à l'import au lieu d'être recréé.
    { id: 16, name: "FCM Travel Solutions", description: "Agence de voyages marches publics", siret: "43042064500017", sifac_code: "28332" },
]

export const mockExpanses: Expanse[] = [
    { id: 1, title: "Achat serveur HP ProLiant", description: "Serveur rack pour calcul HPC", amount: 18500, category: "Investissement", label: "Immobilisation", budget_detail_id: 12, supplier_id: 1, project_id: 1, agreement_id: null, purchase_date: "2023-03-15", delivery_date: "2023-04-02", payment_date: "2023-04-30", status: "Payé", invoice_date: "2023-04-02", flux_id: null, source: 'manual', amount_engaged: 18500, amount_invoiced: 18500, amount_paid: 18500 },
    { id: 2, title: "GPU Nvidia A100", description: "Accelerateur GPU pour apprentissage profond", amount: 22000, category: "Investissement", label: "Immobilisation", budget_detail_id: 12, supplier_id: 2, project_id: 1, agreement_id: null, purchase_date: "2023-04-10", delivery_date: "2023-05-20", payment_date: "2023-06-15", status: "Payé", invoice_date: "2023-05-20", flux_id: null, source: 'manual', amount_engaged: 22000, amount_invoiced: 22000, amount_paid: 22000 },
    { id: 3, title: "Kit de developpement FPGA", description: "Cartes FPGA Xilinx Alveo U250", amount: 8400, category: "Investissement", label: "Matériel", budget_detail_id: 13, supplier_id: 3, project_id: 1, agreement_id: null, purchase_date: "2023-05-05", delivery_date: "2023-05-28", payment_date: "2023-06-20", status: "Payé", invoice_date: "2023-05-28", flux_id: null, source: 'manual', amount_engaged: 8400, amount_invoiced: 8400, amount_paid: 8400 },
    { id: 4, title: "Licence Altair HyperWorks", description: "Suite logicielle simulation CAO", amount: 12000, category: "Investissement", label: "Logiciel", budget_detail_id: 18, supplier_id: 4, project_id: 2, agreement_id: null, purchase_date: "2023-06-01", delivery_date: "2023-06-01", payment_date: "2023-07-01", status: "Payé", invoice_date: "2023-06-01", flux_id: null, source: 'manual', amount_engaged: 12000, amount_invoiced: 12000, amount_paid: 12000 },
    { id: 5, title: "Formation IA embarquee", description: "Formation de 3 jours certifiante", amount: 4500, category: "Fonctionnement", label: "Formation", budget_detail_id: 11, supplier_id: 5, project_id: 1, agreement_id: null, purchase_date: "2023-07-10", delivery_date: "2023-07-12", payment_date: "2023-08-01", status: "Payé", invoice_date: "2023-07-12", flux_id: null, source: 'manual', amount_engaged: 4500, amount_invoiced: 4500, amount_paid: 4500 },
    { id: 6, title: "Mission conference ICCV", description: "Deplacement Paris - Los Angeles", amount: 2800, category: "Fonctionnement", label: "Mission", budget_detail_id: 14, supplier_id: 7, project_id: 1, agreement_id: null, purchase_date: "2023-09-20", delivery_date: "2023-09-25", payment_date: "2023-10-10", status: "Payé", invoice_date: "2023-09-25", flux_id: null, source: 'manual', amount_engaged: 2800, amount_invoiced: 2800, amount_paid: 2800 },
    { id: 7, title: "Hotel conference ICCV", description: "4 nuits Los Angeles", amount: 1200, category: "Fonctionnement", label: "Mission", budget_detail_id: 14, supplier_id: 8, project_id: 1, agreement_id: null, purchase_date: "2023-09-20", delivery_date: "2023-09-25", payment_date: "2023-10-10", status: "Payé", invoice_date: "2023-09-25", flux_id: null, source: 'manual', amount_engaged: 1200, amount_invoiced: 1200, amount_paid: 1200 },
    { id: 8, title: "Contrat postdoc T1 2023", description: "Salaire et charges postdoctorant", amount: 30000, category: "Personnel", label: "Personnel", budget_detail_id: 9, supplier_id: null, project_id: 1, agreement_id: null, purchase_date: "2023-03-01", delivery_date: "2023-06-30", payment_date: "2023-06-30", status: "Payé", invoice_date: "2023-06-30", flux_id: null, source: 'manual', amount_engaged: 30000, amount_invoiced: 30000, amount_paid: 30000 },
    { id: 9, title: "Contrat postdoc T2 2023", description: "Salaire et charges postdoctorant", amount: 30000, category: "Personnel", label: "Personnel", budget_detail_id: 9, supplier_id: null, project_id: 1, agreement_id: null, purchase_date: "2023-07-01", delivery_date: "2023-09-30", payment_date: "2023-09-30", status: "Payé", invoice_date: "2023-09-30", flux_id: null, source: 'manual', amount_engaged: 30000, amount_invoiced: 30000, amount_paid: 30000 },
    { id: 10, title: "Contrat ingenieur T1 2023", description: "Salaire et charges ingenieur de recherche", amount: 22500, category: "Personnel", label: "Personnel", budget_detail_id: 10, supplier_id: null, project_id: 1, agreement_id: null, purchase_date: "2023-03-01", delivery_date: "2023-06-30", payment_date: "2023-06-30", status: "Payé", invoice_date: "2023-06-30", flux_id: null, source: 'manual', amount_engaged: 22500, amount_invoiced: 22500, amount_paid: 22500 },
    { id: 11, title: "Contrat ingenieur T2 2023", description: "Salaire et charges ingenieur de recherche", amount: 22500, category: "Personnel", label: "Personnel", budget_detail_id: 10, supplier_id: null, project_id: 1, agreement_id: null, purchase_date: "2023-07-01", delivery_date: "2023-09-30", payment_date: "2023-09-30", status: "Payé", invoice_date: "2023-09-30", flux_id: null, source: 'manual', amount_engaged: 22500, amount_invoiced: 22500, amount_paid: 22500 },
    { id: 12, title: "Prestations Optika Conseil", description: "Audit et conseil innovation 10 jours", amount: 15000, category: "Fonctionnement", label: "Prestation", budget_detail_id: 17, supplier_id: 9, project_id: 2, agreement_id: null, purchase_date: "2023-10-01", delivery_date: "2023-11-15", payment_date: "2023-12-01", status: "Payé", invoice_date: "2023-11-15", flux_id: null, source: 'manual', amount_engaged: 15000, amount_invoiced: 15000, amount_paid: 15000 },
    { id: 13, title: "Developpement plateforme IoT Sprint 1-2", description: "Sprint 1 et 2 developpement logiciel", amount: 18000, category: "Fonctionnement", label: "Prestation", budget_detail_id: 15, supplier_id: 10, project_id: 2, agreement_id: null, purchase_date: "2023-11-01", delivery_date: "2023-12-31", payment_date: "2024-01-15", status: "Payé", invoice_date: "2023-12-31", flux_id: null, source: 'manual', amount_engaged: 18000, amount_invoiced: 18000, amount_paid: 18000 },
    { id: 14, title: "Facturation interne LIRMM T4 2023", description: "Utilisation equipements mutualisees T4 2023", amount: 5000, category: "Fonctionnement", label: "Facturation interne", budget_detail_id: 19, supplier_id: null, project_id: 1, agreement_id: null, purchase_date: "2023-12-01", delivery_date: "2023-12-31", payment_date: "2024-01-31", status: "Payé", invoice_date: "2023-12-31", flux_id: null, source: 'manual', amount_engaged: 5000, amount_invoiced: 5000, amount_paid: 5000 },
    { id: 15, title: "Stations de travail HP Z4", description: "3 stations de travail haute performance", amount: 9600, category: "Investissement", label: "Immobilisation", budget_detail_id: 12, supplier_id: 1, project_id: 2, agreement_id: null, purchase_date: "2024-01-15", delivery_date: "2024-02-10", payment_date: "2024-03-01", status: "Payé", invoice_date: "2024-02-10", flux_id: null, source: 'manual', amount_engaged: 9600, amount_invoiced: 9600, amount_paid: 9600 },
    { id: 16, title: "Composants microcontroleurs", description: "Lot de 500 microcontroleurs STM32", amount: 3200, category: "Investissement", label: "Matériel", budget_detail_id: 13, supplier_id: 3, project_id: 2, agreement_id: null, purchase_date: "2024-02-05", delivery_date: "2024-02-25", payment_date: "2024-03-15", status: "Payé", invoice_date: "2024-02-25", flux_id: null, source: 'manual', amount_engaged: 3200, amount_invoiced: 3200, amount_paid: 3200 },
    { id: 17, title: "Contrat postdoc T1 2024", description: "Salaire et charges postdoctorant", amount: 31500, category: "Personnel", label: "Personnel", budget_detail_id: 9, supplier_id: null, project_id: 1, agreement_id: null, purchase_date: "2024-01-01", delivery_date: "2024-06-30", payment_date: "2024-06-30", status: "Payé", invoice_date: "2024-06-30", flux_id: null, source: 'manual', amount_engaged: 31500, amount_invoiced: 31500, amount_paid: 31500 },
    { id: 18, title: "Contrat ingenieur T1 2024", description: "Salaire et charges ingenieur de recherche", amount: 23500, category: "Personnel", label: "Personnel", budget_detail_id: 10, supplier_id: null, project_id: 1, agreement_id: null, purchase_date: "2024-01-01", delivery_date: "2024-06-30", payment_date: "2024-06-30", status: "Payé", invoice_date: "2024-06-30", flux_id: null, source: 'manual', amount_engaged: 23500, amount_invoiced: 23500, amount_paid: 23500 },
    { id: 19, title: "Mission ICASSP 2024", description: "Deplacement conference traitement signal", amount: 3200, category: "Fonctionnement", label: "Mission", budget_detail_id: 14, supplier_id: 6, project_id: 1, agreement_id: null, purchase_date: "2024-04-10", delivery_date: "2024-04-15", payment_date: "2024-05-01", status: "Payé", invoice_date: "2024-04-15", flux_id: null, source: 'manual', amount_engaged: 3200, amount_invoiced: 3200, amount_paid: 3200 },
    { id: 20, title: "Formation deep learning Thales", description: "Formation avancee 5 jours", amount: 6000, category: "Fonctionnement", label: "Formation", budget_detail_id: 11, supplier_id: 5, project_id: 1, agreement_id: null, purchase_date: "2024-05-20", delivery_date: "2024-05-24", payment_date: "2024-06-10", status: "Payé", invoice_date: "2024-05-24", flux_id: null, source: 'manual', amount_engaged: 6000, amount_invoiced: 6000, amount_paid: 6000 },
    { id: 21, title: "Serveur stockage NAS", description: "NAS 200 To pour donnees de recherche", amount: 14000, category: "Investissement", label: "Immobilisation", budget_detail_id: 12, supplier_id: 12, project_id: 1, agreement_id: null, purchase_date: "2024-06-01", delivery_date: "2024-07-15", payment_date: "2024-08-01", status: "Payé", invoice_date: "2024-07-15", flux_id: null, source: 'manual', amount_engaged: 14000, amount_invoiced: 14000, amount_paid: 14000 },
    { id: 22, title: "Developpement plateforme IoT Sprint 3-4", description: "Developpement et integration", amount: 20000, category: "Fonctionnement", label: "Prestation", budget_detail_id: 15, supplier_id: 10, project_id: 2, agreement_id: null, purchase_date: "2024-03-01", delivery_date: "2024-06-30", payment_date: "2024-07-15", status: "Payé", invoice_date: "2024-06-30", flux_id: null, source: 'manual', amount_engaged: 20000, amount_invoiced: 20000, amount_paid: 20000 },
    { id: 23, title: "Transfert technologique CEA", description: "Valorisation et transfert brevet", amount: 12000, category: "Fonctionnement", label: "Prestation", budget_detail_id: 16, supplier_id: 11, project_id: 3, agreement_id: null, purchase_date: "2024-07-01", delivery_date: "2024-09-30", payment_date: "2024-10-15", status: "Payé", invoice_date: "2024-09-30", flux_id: null, source: 'manual', amount_engaged: 12000, amount_invoiced: 12000, amount_paid: 12000 },
    { id: 24, title: "Contrat postdoc T2 2024", description: "Salaire et charges postdoctorant", amount: 31500, category: "Personnel", label: "Personnel", budget_detail_id: 9, supplier_id: null, project_id: 1, agreement_id: null, purchase_date: "2024-07-01", delivery_date: "2024-12-31", payment_date: "2024-12-31", status: "Payé", invoice_date: "2024-12-31", flux_id: null, source: 'manual', amount_engaged: 31500, amount_invoiced: 31500, amount_paid: 31500 },
    { id: 25, title: "Contrat ingenieur T2 2024", description: "Salaire et charges ingenieur de recherche", amount: 23500, category: "Personnel", label: "Personnel", budget_detail_id: 10, supplier_id: null, project_id: 1, agreement_id: null, purchase_date: "2024-07-01", delivery_date: "2024-12-31", payment_date: "2024-12-31", status: "Payé", invoice_date: "2024-12-31", flux_id: null, source: 'manual', amount_engaged: 23500, amount_invoiced: 23500, amount_paid: 23500 },
    { id: 26, title: "Capteurs et instrumentation", description: "Capteurs IoT industriels Bertin", amount: 7500, category: "Investissement", label: "Matériel", budget_detail_id: 13, supplier_id: 13, project_id: 2, agreement_id: null, purchase_date: "2024-09-10", delivery_date: "2024-10-05", payment_date: "2024-11-01", status: "Payé", invoice_date: "2024-10-05", flux_id: null, source: 'manual', amount_engaged: 7500, amount_invoiced: 7500, amount_paid: 7500 },
    { id: 27, title: "Facturation interne LIRMM T3-T4 2024", description: "Utilisation equipements et plateformes", amount: 6000, category: "Fonctionnement", label: "Facturation interne", budget_detail_id: 19, supplier_id: null, project_id: 1, agreement_id: null, purchase_date: "2024-10-01", delivery_date: "2024-12-31", payment_date: "2025-01-31", status: "Payé", invoice_date: "2024-12-31", flux_id: null, source: 'manual', amount_engaged: 6000, amount_invoiced: 6000, amount_paid: 6000 },
    { id: 28, title: "Formation gestion de projet", description: "Formation PMP 2 jours CNRS", amount: 3500, category: "Fonctionnement", label: "Formation", budget_detail_id: 11, supplier_id: 14, project_id: null, agreement_id: null, purchase_date: "2025-01-15", delivery_date: "2025-01-16", payment_date: "2025-02-01", status: "Payé", invoice_date: "2025-01-16", flux_id: null, source: 'manual', amount_engaged: 3500, amount_invoiced: 3500, amount_paid: 3500 },
    { id: 29, title: "Contrat postdoc 2025 S1", description: "Salaire et charges postdoctorant", amount: 32000, category: "Personnel", label: "Personnel", budget_detail_id: 9, supplier_id: null, project_id: 1, agreement_id: null, purchase_date: "2025-01-01", delivery_date: "2025-06-30", payment_date: "2025-06-30", status: "Payé", invoice_date: "2025-06-30", flux_id: null, source: 'manual', amount_engaged: 32000, amount_invoiced: 32000, amount_paid: 32000 },
    { id: 30, title: "Contrat ingenieur 2025 S1", description: "Salaire et charges ingenieur de recherche", amount: 24000, category: "Personnel", label: "Personnel", budget_detail_id: 10, supplier_id: null, project_id: 1, agreement_id: null, purchase_date: "2025-01-01", delivery_date: "2025-06-30", payment_date: "2025-06-30", status: "Payé", invoice_date: "2025-06-30", flux_id: null, source: 'manual', amount_engaged: 24000, amount_invoiced: 24000, amount_paid: 24000 },
    { id: 31, title: "Infrastructure cloud Atos", description: "Abonnement cloud HPC 6 mois", amount: 9000, category: "Fonctionnement", label: "Prestation", budget_detail_id: 15, supplier_id: 12, project_id: 1, agreement_id: null, purchase_date: "2025-01-01", delivery_date: "2025-06-30", payment_date: "2025-07-15", status: "Payé", invoice_date: "2025-06-30", flux_id: null, source: 'manual', amount_engaged: 9000, amount_invoiced: 9000, amount_paid: 9000 },
    { id: 32, title: "Mission ECCV 2025", description: "Deplacement conference vision par ordinateur", amount: 2600, category: "Fonctionnement", label: "Mission", budget_detail_id: 14, supplier_id: 7, project_id: 1, agreement_id: null, purchase_date: "2025-09-01", delivery_date: "2025-09-05", payment_date: "2025-09-20", status: "Payé", invoice_date: "2025-09-05", flux_id: null, source: 'manual', amount_engaged: 2600, amount_invoiced: 2600, amount_paid: 2600 },
    { id: 33, title: "Contrat postdoc 2025 S2", description: "Salaire et charges postdoctorant", amount: 32000, category: "Personnel", label: "Personnel", budget_detail_id: 9, supplier_id: null, project_id: 1, agreement_id: null, purchase_date: "2025-07-01", delivery_date: "2025-12-31", payment_date: "2025-12-31", status: "En cours", invoice_date: "", flux_id: null, source: 'manual', amount_engaged: 32000, amount_invoiced: 0, amount_paid: 0 },
    { id: 34, title: "Equipement laboratoire complementaire", description: "Oscilloscopes et analyseurs de spectre", amount: 11000, category: "Investissement", label: "Matériel", budget_detail_id: 13, supplier_id: 13, project_id: 3, agreement_id: null, purchase_date: "2025-10-01", delivery_date: "2025-11-15", payment_date: "2025-12-01", status: "En cours", invoice_date: "", flux_id: null, source: 'manual', amount_engaged: 11000, amount_invoiced: 0, amount_paid: 0 },
    { id: 35, title: "Developpement plateforme IoT Sprint 5-6", description: "Finalisation et tests integration", amount: 18000, category: "Fonctionnement", label: "Prestation", budget_detail_id: 15, supplier_id: 10, project_id: 2, agreement_id: null, purchase_date: "2025-11-01", delivery_date: "2026-02-28", payment_date: null as unknown as string, status: "En cours", invoice_date: "", flux_id: null, source: 'manual', amount_engaged: 18000, amount_invoiced: 0, amount_paid: 0 },
    { id: 36, title: "Reversement Convention Association B", description: "Reversement subvention convention signée", amount: 50000, category: "Fonctionnement", label: "Reversement", budget_detail_id: null, supplier_id: null, project_id: 2, agreement_id: 2, purchase_date: "2024-06-15", delivery_date: "2024-06-15", payment_date: "2024-07-01", status: "Payé", invoice_date: "2024-06-15", flux_id: null, source: 'manual', amount_engaged: 50000, amount_invoiced: 50000, amount_paid: 50000 },
    { id: 37, title: "Reversement Convention Collectivité D", description: "Reversement subvention convention signée", amount: 15000, category: "Fonctionnement", label: "Reversement", budget_detail_id: null, supplier_id: null, project_id: 2, agreement_id: 5, purchase_date: "2025-03-15", delivery_date: "2025-03-15", payment_date: "2025-04-01", status: "Payé", invoice_date: "2025-03-15", flux_id: null, source: 'manual', amount_engaged: 15000, amount_invoiced: 15000, amount_paid: 15000 },

    // --- Lignes issues de l'import SIFAC (agrégats par flux) ---
    { id: 38, title: "DOSSIER TRAIN", description: "FCM TRAVEL", amount: 209, category: "", label: "", budget_detail_id: null, supplier_id: null, project_id: null, agreement_id: null, purchase_date: "2026-04-16", delivery_date: "", payment_date: "2026-06-15", invoice_date: "2026-05-22", status: "Payé", flux_id: "4500666189-00020", source: 'sifac', amount_engaged: 209, amount_invoiced: 209, amount_paid: 209 },
    { id: 39, title: "DOSSIER TRAIN", description: "FCM TRAVEL", amount: 78, category: "", label: "", budget_detail_id: null, supplier_id: null, project_id: null, agreement_id: null, purchase_date: "2026-04-10", delivery_date: "", payment_date: "2026-06-15", invoice_date: "2026-05-20", status: "Payé", flux_id: "4500665672-00010", source: 'sifac', amount_engaged: 78, amount_invoiced: 61, amount_paid: 61 },
    { id: 40, title: "REMBOURSEMENT FRAIS", description: "Christian IGEL", amount: -138.93, category: "", label: "", budget_detail_id: null, supplier_id: null, project_id: null, agreement_id: null, purchase_date: "2025-09-02", delivery_date: "", payment_date: "", invoice_date: "", status: "Engagé", flux_id: "3200002393-00001", source: 'sifac', amount_engaged: -138.93, amount_invoiced: 0, amount_paid: 0 },
    { id: 41, title: "DOSSIER TRAIN", description: "FCM TRAVEL", amount: 44, category: "", label: "", budget_detail_id: null, supplier_id: null, project_id: null, agreement_id: null, purchase_date: "2026-03-13", delivery_date: "", payment_date: "2026-06-15", invoice_date: "2026-05-05", status: "Engagé", flux_id: "4500662737-00010", source: 'sifac', amount_engaged: 44, amount_invoiced: 0, amount_paid: 0 },
]

export const mockSifacLines: SifacLine[] = [
    { id: 1, pfi: "24FACLUSTK", exercice: 2026, flux_id: "4500666189-00020", flux_label: "DOSSIER TRAIN", rubrique: "COMMANDE/FACTURE", supplier_name: "FCM TRAVEL", supplier_code: "28332", account: "62510000", account_label: "Voyages et déplacements", engagement_date: "2026-05-22", csf_date: "2026-05-22", amount_engaged: 0, amount_certified: 0, amount_received: -54, invoice_number: "5105852488", invoice_date: "2026-05-22", invoice_text: "", amount_invoiced: 54, amount_paid: 0, payment_date: "", amount_report: 0, otp: "24FACLUSTK-PMO", category: "FG" },
    { id: 2, pfi: "24FACLUSTK", exercice: 2026, flux_id: "4500666189-00020", flux_label: "DOSSIER TRAIN", rubrique: "COMMANDE/FACTURE", supplier_name: "FCM TRAVEL", supplier_code: "28332", account: "62510000", account_label: "Voyages et déplacements", engagement_date: "2026-05-22", csf_date: "2026-05-22", amount_engaged: 0, amount_certified: 0, amount_received: -68, invoice_number: "5105852489", invoice_date: "2026-05-22", invoice_text: "", amount_invoiced: 68, amount_paid: 0, payment_date: "", amount_report: 0, otp: "24FACLUSTK-PMO", category: "FG" },
    { id: 3, pfi: "24FACLUSTK", exercice: 2026, flux_id: "4500666189-00020", flux_label: "DOSSIER TRAIN", rubrique: "COMMANDE/FACTURE", supplier_name: "FCM TRAVEL", supplier_code: "28332", account: "62510000", account_label: "Voyages et déplacements", engagement_date: "2026-05-22", csf_date: "2026-05-22", amount_engaged: 0, amount_certified: 0, amount_received: -45, invoice_number: "5105852490", invoice_date: "2026-05-22", invoice_text: "", amount_invoiced: 45, amount_paid: 0, payment_date: "", amount_report: 0, otp: "24FACLUSTK-PMO", category: "FG" },
    { id: 4, pfi: "24FACLUSTK", exercice: 2026, flux_id: "4500666189-00020", flux_label: "DOSSIER TRAIN", rubrique: "COMMANDE/FACTURE", supplier_name: "FCM TRAVEL", supplier_code: "28332", account: "62510000", account_label: "Voyages et déplacements", engagement_date: "2026-05-22", csf_date: "2026-05-22", amount_engaged: 0, amount_certified: 0, amount_received: -42, invoice_number: "5105852491", invoice_date: "2026-05-22", invoice_text: "", amount_invoiced: 42, amount_paid: 0, payment_date: "", amount_report: 0, otp: "24FACLUSTK-PMO", category: "FG" },
    { id: 5, pfi: "24FACLUSTK", exercice: 2026, flux_id: "4500666189-00020", flux_label: "DOSSIER TRAIN", rubrique: "COMMANDE/FACTURE/PAIEMENT", supplier_name: "FCM TRAVEL", supplier_code: "28332", account: "62510000", account_label: "Voyages et déplacements", engagement_date: "2026-05-22", csf_date: "2026-05-22", amount_engaged: 0, amount_certified: 0, amount_received: 0, invoice_number: "5105852488", invoice_date: "2026-05-22", invoice_text: "", amount_invoiced: 0, amount_paid: 54, payment_date: "2025-12-20", amount_report: 0, otp: "24FACLUSTK-PMO", category: "FG" },
    { id: 6, pfi: "24FACLUSTK", exercice: 2026, flux_id: "4500666189-00020", flux_label: "DOSSIER TRAIN", rubrique: "COMMANDE/FACTURE/PAIEMENT", supplier_name: "FCM TRAVEL", supplier_code: "28332", account: "62510000", account_label: "Voyages et déplacements", engagement_date: "2026-05-22", csf_date: "2026-05-22", amount_engaged: 0, amount_certified: 0, amount_received: 0, invoice_number: "5105852489", invoice_date: "2026-05-22", invoice_text: "", amount_invoiced: 0, amount_paid: 68, payment_date: "2026-06-15", amount_report: 0, otp: "24FACLUSTK-PMO", category: "FG" },
    { id: 7, pfi: "24FACLUSTK", exercice: 2026, flux_id: "4500666189-00020", flux_label: "DOSSIER TRAIN", rubrique: "COMMANDE/FACTURE/PAIEMENT", supplier_name: "FCM TRAVEL", supplier_code: "28332", account: "62510000", account_label: "Voyages et déplacements", engagement_date: "2026-05-22", csf_date: "2026-05-22", amount_engaged: 0, amount_certified: 0, amount_received: 0, invoice_number: "5105852490", invoice_date: "2026-05-22", invoice_text: "", amount_invoiced: 0, amount_paid: 45, payment_date: "2026-06-15", amount_report: 0, otp: "24FACLUSTK-PMO", category: "FG" },
    { id: 8, pfi: "24FACLUSTK", exercice: 2026, flux_id: "4500666189-00020", flux_label: "DOSSIER TRAIN", rubrique: "COMMANDE/FACTURE/PAIEMENT", supplier_name: "FCM TRAVEL", supplier_code: "28332", account: "62510000", account_label: "Voyages et déplacements", engagement_date: "2026-05-22", csf_date: "2026-05-22", amount_engaged: 0, amount_certified: 0, amount_received: 0, invoice_number: "5105852491", invoice_date: "2026-05-22", invoice_text: "", amount_invoiced: 0, amount_paid: 42, payment_date: "2026-06-15", amount_report: 0, otp: "24FACLUSTK-PMO", category: "FG" },
    { id: 9, pfi: "24FACLUSTK", exercice: 2026, flux_id: "4500666189-00020", flux_label: "DOSSIER TRAIN", rubrique: "COMMANDE", supplier_name: "FCM TRAVEL", supplier_code: "28332", account: "62510000", account_label: "Voyages et déplacements", engagement_date: "2026-04-16", csf_date: "", amount_engaged: 209, amount_certified: 0, amount_received: 0, invoice_number: "", invoice_date: "", invoice_text: "", amount_invoiced: 0, amount_paid: 0, payment_date: "", amount_report: 0, otp: "24FACLUSTK-PMO", category: "FG" },
    { id: 10, pfi: "24FACLUSTK", exercice: 2026, flux_id: "4500665672-00010", flux_label: "DOSSIER TRAIN", rubrique: "COMMANDE/AVOIR/PAIEMENT", supplier_name: "FCM TRAVEL", supplier_code: "28332", account: "62510000", account_label: "Voyages et déplacements", engagement_date: "2026-05-20", csf_date: "2026-05-20", amount_engaged: 0, amount_certified: 0, amount_received: 0, invoice_number: "5105854289", invoice_date: "2026-05-20", invoice_text: "", amount_invoiced: 0, amount_paid: -48, payment_date: "2026-06-15", amount_report: 0, otp: "24FACLUSTK-PMO", category: "FG" },
    { id: 11, pfi: "24FACLUSTK", exercice: 2026, flux_id: "4500665672-00010", flux_label: "DOSSIER TRAIN", rubrique: "COMMANDE/FACTURE/PAIEMENT", supplier_name: "FCM TRAVEL", supplier_code: "28332", account: "62510000", account_label: "Voyages et déplacements", engagement_date: "2026-05-20", csf_date: "2026-05-20", amount_engaged: 0, amount_certified: 0, amount_received: 0, invoice_number: "5105852163", invoice_date: "2026-05-20", invoice_text: "", amount_invoiced: 0, amount_paid: 31, payment_date: "2026-06-15", amount_report: 0, otp: "24FACLUSTK-PMO", category: "FG" },
    { id: 12, pfi: "24FACLUSTK", exercice: 2026, flux_id: "4500665672-00010", flux_label: "DOSSIER TRAIN", rubrique: "COMMANDE/FACTURE/PAIEMENT", supplier_name: "FCM TRAVEL", supplier_code: "28332", account: "62510000", account_label: "Voyages et déplacements", engagement_date: "2026-05-20", csf_date: "2026-05-20", amount_engaged: 0, amount_certified: 0, amount_received: 0, invoice_number: "5105852161", invoice_date: "2026-05-20", invoice_text: "", amount_invoiced: 0, amount_paid: 48, payment_date: "2026-06-15", amount_report: 0, otp: "24FACLUSTK-PMO", category: "FG" },
    { id: 13, pfi: "24FACLUSTK", exercice: 2026, flux_id: "4500665672-00010", flux_label: "DOSSIER TRAIN", rubrique: "COMMANDE/FACTURE/PAIEMENT", supplier_name: "FCM TRAVEL", supplier_code: "28332", account: "62510000", account_label: "Voyages et déplacements", engagement_date: "2026-05-20", csf_date: "2026-05-20", amount_engaged: 0, amount_certified: 0, amount_received: 0, invoice_number: "5105852162", invoice_date: "2026-05-20", invoice_text: "", amount_invoiced: 0, amount_paid: 30, payment_date: "2026-06-15", amount_report: 0, otp: "24FACLUSTK-PMO", category: "FG" },
    { id: 14, pfi: "24FACLUSTK", exercice: 2026, flux_id: "4500665672-00010", flux_label: "DOSSIER TRAIN", rubrique: "COMMANDE", supplier_name: "FCM TRAVEL", supplier_code: "28332", account: "62510000", account_label: "Voyages et déplacements", engagement_date: "2026-04-10", csf_date: "", amount_engaged: 78, amount_certified: 0, amount_received: 0, invoice_number: "", invoice_date: "", invoice_text: "", amount_invoiced: 0, amount_paid: 0, payment_date: "", amount_report: 0, otp: "24FACLUSTK-PMO", category: "FG" },
    { id: 15, pfi: "24FACLUSTK", exercice: 2026, flux_id: "4500665672-00010", flux_label: "DOSSIER TRAIN", rubrique: "COMMANDE/FACTURE", supplier_name: "FCM TRAVEL", supplier_code: "28332", account: "62510000", account_label: "Voyages et déplacements", engagement_date: "2026-05-20", csf_date: "2026-05-20", amount_engaged: 0, amount_certified: 0, amount_received: -48, invoice_number: "5105852161", invoice_date: "2026-05-20", invoice_text: "", amount_invoiced: 48, amount_paid: 0, payment_date: "", amount_report: 0, otp: "24FACLUSTK-PMO", category: "FG" },
    { id: 16, pfi: "24FACLUSTK", exercice: 2026, flux_id: "4500665672-00010", flux_label: "DOSSIER TRAIN", rubrique: "COMMANDE/FACTURE", supplier_name: "FCM TRAVEL", supplier_code: "28332", account: "62510000", account_label: "Voyages et déplacements", engagement_date: "2026-05-20", csf_date: "2026-05-20", amount_engaged: 0, amount_certified: 0, amount_received: -30, invoice_number: "5105852162", invoice_date: "2026-05-20", invoice_text: "", amount_invoiced: 30, amount_paid: 0, payment_date: "", amount_report: 0, otp: "24FACLUSTK-PMO", category: "FG" },
    { id: 17, pfi: "24FACLUSTK", exercice: 2026, flux_id: "4500665672-00010", flux_label: "DOSSIER TRAIN", rubrique: "COMMANDE/FACTURE", supplier_name: "FCM TRAVEL", supplier_code: "28332", account: "62510000", account_label: "Voyages et déplacements", engagement_date: "2026-05-20", csf_date: "2026-05-20", amount_engaged: 0, amount_certified: 0, amount_received: -31, invoice_number: "5105852163", invoice_date: "2026-05-20", invoice_text: "", amount_invoiced: 31, amount_paid: 0, payment_date: "", amount_report: 0, otp: "24FACLUSTK-PMO", category: "FG" },
    { id: 18, pfi: "24FACLUSTK", exercice: 2026, flux_id: "4500665672-00010", flux_label: "DOSSIER TRAIN", rubrique: "COMMANDE/AVOIR", supplier_name: "FCM TRAVEL", supplier_code: "28332", account: "62510000", account_label: "Voyages et déplacements", engagement_date: "2026-05-20", csf_date: "2026-05-20", amount_engaged: 0, amount_certified: 0, amount_received: 48, invoice_number: "5105854289", invoice_date: "2026-05-20", invoice_text: "", amount_invoiced: -48, amount_paid: 0, payment_date: "", amount_report: 0, otp: "24FACLUSTK-PMO", category: "FG" },
    { id: 19, pfi: "24FACLUSTK", exercice: 2026, flux_id: "3200002393-00001", flux_label: "REMBOURSEMENT FRAIS", rubrique: "RESERVATIONS DE CREDITS", supplier_name: "Christian IGEL", supplier_code: "5515081", account: "62560000", account_label: "Missions personnels", engagement_date: "2025-09-02", csf_date: "", amount_engaged: -138.93, amount_certified: 0, amount_received: 0, invoice_number: "", invoice_date: "", invoice_text: "", amount_invoiced: 0, amount_paid: 0, payment_date: "", amount_report: 0, otp: "24FACLUSTK-VAT", category: "FG" },
    { id: 20, pfi: "24FACLUSTK", exercice: 2026, flux_id: "3200002393-00001", flux_label: "", rubrique: "RESERVATION DE CREDITS REPORT", supplier_name: "Christian IGEL", supplier_code: "5515081", account: "62560000", account_label: "Missions personnels", engagement_date: "2025-09-02", csf_date: "", amount_engaged: 0, amount_certified: 0, amount_received: 0, invoice_number: "", invoice_date: "", invoice_text: "", amount_invoiced: 0, amount_paid: 0, payment_date: "", amount_report: 138.93, otp: "24FACLUSTK-VAT", category: "FG" },
    { id: 21, pfi: "24FACLUSTK", exercice: 2026, flux_id: "4500662737-00010", flux_label: "DOSSIER TRAIN", rubrique: "COMMANDE/AVOIR/PAIEMENT", supplier_name: "FCM TRAVEL", supplier_code: "28332", account: "62510000", account_label: "Voyages et déplacements", engagement_date: "2026-05-05", csf_date: "2026-05-05", amount_engaged: 0, amount_certified: 0, amount_received: 0, invoice_number: "5105848860", invoice_date: "2026-05-05", invoice_text: "", amount_invoiced: 0, amount_paid: -22, payment_date: "2026-06-15", amount_report: 0, otp: "24FACLUSTK-PMO", category: "FG" },
    { id: 22, pfi: "24FACLUSTK", exercice: 2026, flux_id: "4500662737-00010", flux_label: "DOSSIER TRAIN", rubrique: "COMMANDE/AVOIR/PAIEMENT", supplier_name: "FCM TRAVEL", supplier_code: "28332", account: "62510000", account_label: "Voyages et déplacements", engagement_date: "2026-05-05", csf_date: "2026-05-05", amount_engaged: 0, amount_certified: 0, amount_received: 0, invoice_number: "5105848861", invoice_date: "2026-05-05", invoice_text: "", amount_invoiced: 0, amount_paid: -22, payment_date: "2026-06-15", amount_report: 0, otp: "24FACLUSTK-PMO", category: "FG" },
    { id: 23, pfi: "24FACLUSTK", exercice: 2026, flux_id: "4500662737-00010", flux_label: "DOSSIER TRAIN", rubrique: "COMMANDE", supplier_name: "FCM TRAVEL", supplier_code: "28332", account: "62510000", account_label: "Voyages et déplacements", engagement_date: "2026-03-13", csf_date: "", amount_engaged: 44, amount_certified: 0, amount_received: 0, invoice_number: "", invoice_date: "", invoice_text: "", amount_invoiced: 0, amount_paid: 0, payment_date: "", amount_report: 0, otp: "24FACLUSTK-PMO", category: "FG" },
    { id: 24, pfi: "24FACLUSTK", exercice: 2026, flux_id: "4500662737-00010", flux_label: "DOSSIER TRAIN", rubrique: "COMMANDE/FACTURE", supplier_name: "FCM TRAVEL", supplier_code: "28332", account: "62510000", account_label: "Voyages et déplacements", engagement_date: "2026-04-20", csf_date: "2026-04-20", amount_engaged: 0, amount_certified: 0, amount_received: -22, invoice_number: "5105845159", invoice_date: "2026-04-20", invoice_text: "", amount_invoiced: 22, amount_paid: 0, payment_date: "", amount_report: 0, otp: "24FACLUSTK-PMO", category: "FG" },
    { id: 25, pfi: "24FACLUSTK", exercice: 2026, flux_id: "4500662737-00010", flux_label: "DOSSIER TRAIN", rubrique: "COMMANDE/FACTURE", supplier_name: "FCM TRAVEL", supplier_code: "28332", account: "62510000", account_label: "Voyages et déplacements", engagement_date: "2026-04-20", csf_date: "2026-04-20", amount_engaged: 0, amount_certified: 0, amount_received: -22, invoice_number: "5105845265", invoice_date: "2026-04-20", invoice_text: "", amount_invoiced: 22, amount_paid: 0, payment_date: "", amount_report: 0, otp: "24FACLUSTK-PMO", category: "FG" },
    { id: 26, pfi: "24FACLUSTK", exercice: 2026, flux_id: "4500662737-00010", flux_label: "DOSSIER TRAIN", rubrique: "COMMANDE/FACTURE/PAIEMENT", supplier_name: "FCM TRAVEL", supplier_code: "28332", account: "62510000", account_label: "Voyages et déplacements", engagement_date: "2026-04-20", csf_date: "2026-04-20", amount_engaged: 0, amount_certified: 0, amount_received: 0, invoice_number: "5105845159", invoice_date: "2026-04-20", invoice_text: "", amount_invoiced: 0, amount_paid: 22, payment_date: "2026-05-05", amount_report: 0, otp: "24FACLUSTK-PMO", category: "FG" },
    { id: 27, pfi: "24FACLUSTK", exercice: 2026, flux_id: "4500662737-00010", flux_label: "DOSSIER TRAIN", rubrique: "COMMANDE/FACTURE/PAIEMENT", supplier_name: "FCM TRAVEL", supplier_code: "28332", account: "62510000", account_label: "Voyages et déplacements", engagement_date: "2026-04-20", csf_date: "2026-04-20", amount_engaged: 0, amount_certified: 0, amount_received: 0, invoice_number: "5105845265", invoice_date: "2026-04-20", invoice_text: "", amount_invoiced: 0, amount_paid: 22, payment_date: "2026-05-05", amount_report: 0, otp: "24FACLUSTK-PMO", category: "FG" },
    { id: 28, pfi: "24FACLUSTK", exercice: 2026, flux_id: "4500662737-00010", flux_label: "DOSSIER TRAIN", rubrique: "COMMANDE/AVOIR", supplier_name: "FCM TRAVEL", supplier_code: "28332", account: "62510000", account_label: "Voyages et déplacements", engagement_date: "2026-05-05", csf_date: "2026-05-05", amount_engaged: 0, amount_certified: 0, amount_received: 22, invoice_number: "5105848860", invoice_date: "2026-05-05", invoice_text: "", amount_invoiced: -22, amount_paid: 0, payment_date: "", amount_report: 0, otp: "24FACLUSTK-PMO", category: "FG" },
    { id: 29, pfi: "24FACLUSTK", exercice: 2026, flux_id: "4500662737-00010", flux_label: "DOSSIER TRAIN", rubrique: "COMMANDE/AVOIR", supplier_name: "FCM TRAVEL", supplier_code: "28332", account: "62510000", account_label: "Voyages et déplacements", engagement_date: "2026-05-05", csf_date: "2026-05-05", amount_engaged: 0, amount_certified: 0, amount_received: 22, invoice_number: "5105848861", invoice_date: "2026-05-05", invoice_text: "", amount_invoiced: -22, amount_paid: 0, payment_date: "", amount_report: 0, otp: "24FACLUSTK-PMO", category: "FG" },

    // Flux IG — investissement. Fournisseur déjà fiché (Dell, sifac_code 102345) :
    // l'import doit le retrouver, pas en créer un second.
    { id: 30, pfi: "24FACLUSTK", exercice: 2026, flux_id: "4500667001-00010", flux_label: "SERVEUR CALCUL", rubrique: "COMMANDE", supplier_name: "DELL TECHNOLOGIES FRANCE", supplier_code: "102345", account: "21830000", account_label: "Matériel informatique", engagement_date: "2026-02-10", csf_date: "", amount_engaged: 4200, amount_certified: 0, amount_received: 0, invoice_number: "", invoice_date: "", invoice_text: "", amount_invoiced: 0, amount_paid: 0, payment_date: "", amount_report: 0, otp: "24FACLUSTK-PMO", category: "IG" },
    { id: 31, pfi: "24FACLUSTK", exercice: 2026, flux_id: "4500667001-00010", flux_label: "SERVEUR CALCUL", rubrique: "COMMANDE/FACTURE", supplier_name: "DELL TECHNOLOGIES FRANCE", supplier_code: "102345", account: "21830000", account_label: "Matériel informatique", engagement_date: "2026-02-10", csf_date: "2026-03-18", amount_engaged: 0, amount_certified: 0, amount_received: -4200, invoice_number: "5105860001", invoice_date: "2026-03-18", invoice_text: "Serveur rack 2U", amount_invoiced: 4200, amount_paid: 0, payment_date: "", amount_report: 0, otp: "24FACLUSTK-PMO", category: "IG" },
    { id: 32, pfi: "24FACLUSTK", exercice: 2026, flux_id: "4500667001-00010", flux_label: "SERVEUR CALCUL", rubrique: "COMMANDE/FACTURE/PAIEMENT", supplier_name: "DELL TECHNOLOGIES FRANCE", supplier_code: "102345", account: "21830000", account_label: "Matériel informatique", engagement_date: "2026-02-10", csf_date: "2026-03-18", amount_engaged: 0, amount_certified: 0, amount_received: 0, invoice_number: "5105860001", invoice_date: "2026-03-18", invoice_text: "", amount_invoiced: 0, amount_paid: 4200, payment_date: "2026-04-02", amount_report: 0, otp: "24FACLUSTK-PMO", category: "IG" },

    // Flux MS — masse salariale. Aucun tiers : les écritures de paie n'en portent
    // pas. `supplier_code` vide doit laisser `supplier_id` à null, sans créer de
    // fiche fantôme.
    { id: 33, pfi: "24FACLUSTK", exercice: 2026, flux_id: "3200002501-00001", flux_label: "PAIE JANVIER 2026", rubrique: "ECRITURE DE PAIE", supplier_name: "", supplier_code: "", account: "64110000", account_label: "Rémunérations principales", engagement_date: "2026-01-31", csf_date: "", amount_engaged: 2850.4, amount_certified: 0, amount_received: 0, invoice_number: "", invoice_date: "", invoice_text: "", amount_invoiced: 0, amount_paid: 0, payment_date: "", amount_report: 0, otp: "24FACLUSTK-VAT", category: "MS" },
    { id: 34, pfi: "24FACLUSTK", exercice: 2026, flux_id: "3200002501-00001", flux_label: "PAIE JANVIER 2026", rubrique: "ECRITURE DE PAIE", supplier_name: "", supplier_code: "", account: "64110000", account_label: "Rémunérations principales", engagement_date: "2026-01-31", csf_date: "", amount_engaged: 0, amount_certified: 0, amount_received: 0, invoice_number: "", invoice_date: "", invoice_text: "", amount_invoiced: 2850.4, amount_paid: 2850.4, payment_date: "2026-02-05", amount_report: 0, otp: "24FACLUSTK-VAT", category: "MS" },
]

export let mockPublications: Publication[] = [
    { id: 1, project_id: 1, title: 'Deep learning for environmental signal processing', lab_id: 1, subject: 'IA, traitement du signal, environnement', journal: 'IEEE Transactions on Signal Processing', year: '2024', doi: '10.1109/TSP.2024.000001' },
    { id: 2, project_id: 1, title: 'Adaptive neural architectures for low-power IoT sensing', lab_id: 2, subject: 'IoT, edge computing, efficacité énergétique', journal: 'Nature Electronics', year: '2025', doi: '10.1038/s41928-025-00001-x' },
    { id: 3, project_id: 2, title: 'Interoperability framework for industrial IoT platforms', lab_id: null, subject: 'IoT industriel, interopérabilité, standards', journal: 'Actes ICASSP 2024', year: '2024', doi: '' },
]

export let mockPublicationMembers: PublicationMember[] = [
    { id: 1, publication_id: 1, member_id: 1 },
    { id: 2, publication_id: 1, member_id: 2 },
    { id: 3, publication_id: 2, member_id: 2 },
    { id: 4, publication_id: 2, member_id: 4 },
    { id: 5, publication_id: 3, member_id: 5 },
]
