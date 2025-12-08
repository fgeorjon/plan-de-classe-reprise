# État de la Synchronisation des Données

## ✅ Le système de synchronisation fonctionne DÉJÀ !

Le code est bien configuré pour filtrer les données selon le rôle de l'utilisateur.

### Comment ça fonctionne

#### Pour les ÉLÈVES (students)
- **Vie scolaire** → Voit TOUS les élèves de l'établissement
- **Professeur** → Voit uniquement SES élèves (via `teacher_classes`)
- **Délégué/Éco-délégué** → Voit uniquement les camarades de SA classe

#### Pour les PROFESSEURS (teachers)
- **Vie scolaire** → Voit TOUS les professeurs de l'établissement
- **Professeur** → Voit ses collègues qui enseignent dans les mêmes classes
- **Délégué/Éco-délégué** → Voit uniquement SES professeurs

### Table clé : `teacher_classes`

Cette table fait le lien entre les professeurs et leurs classes. **ELLE DOIT ÊTRE REMPLIE** pour que la synchronisation fonctionne.

Structure :
\`\`\`sql
teacher_classes (
  id UUID PRIMARY KEY,
  teacher_id UUID REFERENCES teachers(id),
  class_id UUID REFERENCES classes(id),
  created_at TIMESTAMP
)
\`\`\`

### Vérification

Exécutez cette requête pour voir si la table est remplie :
\`\`\`sql
SELECT 
  t.first_name,
  t.last_name,
  t.subject,
  c.name as class_name
FROM teacher_classes tc
JOIN teachers t ON tc.teacher_id = t.id
JOIN classes c ON tc.class_id = c.id
ORDER BY t.last_name, c.name;
\`\`\`

Si elle est vide, exécutez le script `016_populate_teacher_classes.sql` ci-dessous.

## Script à exécuter

Créez le fichier `scripts/016_populate_teacher_classes.sql` et exécutez-le dans Supabase.
