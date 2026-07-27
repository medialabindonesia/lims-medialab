-- Freeze the current effective document metadata for all existing samples.
-- COALESCE keeps any snapshot that was already explicitly revised.
UPDATE `SampleParameter` sp
JOIN `Sample` s ON s.`id` = sp.`sampleId`
JOIN `AnalysisParameter` ap ON ap.`id` = sp.`parameterId`
LEFT JOIN `CoaTemplateParameter` ctp ON ctp.`id` = sp.`templateParameterId`
LEFT JOIN `QuotationItem` qi
  ON qi.`quotationId` = s.`quotationId`
 AND qi.`parameterId` = sp.`parameterId`
SET
  sp.`displayNameSnapshot` = COALESCE(
    sp.`displayNameSnapshot`, ctp.`displayName`, ap.`name`
  ),
  sp.`unitSnapshot` = COALESCE(
    sp.`unitSnapshot`, ctp.`unit`, ap.`unit`
  ),
  sp.`methodSnapshot` = COALESCE(
    sp.`methodSnapshot`, qi.`method`, ctp.`method`, ap.`method`
  ),
  sp.`standardSnapshot` = COALESCE(
    sp.`standardSnapshot`, qi.`regulationMatrix`, ctp.`standard`
  ),
  sp.`limitSnapshot` = COALESCE(
    sp.`limitSnapshot`, ctp.`limitValue`
  );
