-- Título profesional único por Professional (no por matrícula).
ALTER TABLE "Professional" ADD COLUMN "professionalTitle" "ProfessionalTitle" NOT NULL DEFAULT 'AGRIMENSOR';

UPDATE "Professional" AS p
SET "professionalTitle" = sub."professionalTitle"
FROM (
  SELECT "professionalId", "professionalTitle"
  FROM (
    SELECT
      pr."professionalId",
      pr."professionalTitle",
      ROW_NUMBER() OVER (
        PARTITION BY pr."professionalId"
        ORDER BY
          CASE WHEN LOWER(pr."jurisdiction") LIKE '%san juan%' THEN 0 ELSE 1 END,
          pr."createdAt" ASC
      ) AS rn
    FROM "ProfessionalRegistration" pr
  ) ranked
  WHERE rn = 1
) AS sub
WHERE p.id = sub."professionalId";

ALTER TABLE "ProfessionalRegistration" DROP COLUMN "professionalTitle";
