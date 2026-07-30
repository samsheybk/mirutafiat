-- Permitir inserciones anónimas en ats_candidatos para postulaciones públicas
CREATE POLICY "Permitir postulaciones públicas"
ON ats_candidatos
FOR INSERT
TO anon
WITH CHECK (true);
