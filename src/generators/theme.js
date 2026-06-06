const { XML_DECL } = require('../utils/xml-helpers');

function generateTheme(themeConfig = {}) {
  const colors = themeConfig.colors || {};
  const dk1 = colors.dk1 || '000000';
  const lt1 = colors.lt1 || 'FFFFFF';
  const dk2 = colors.dk2 || '44546A';
  const lt2 = colors.lt2 || 'E7E6E6';
  const accent1 = colors.accent1 || '4472C4';
  const accent2 = colors.accent2 || 'ED7D31';
  const accent3 = colors.accent3 || 'A5A5A5';
  const accent4 = colors.accent4 || 'FFC000';
  const accent5 = colors.accent5 || '5B9BD5';
  const accent6 = colors.accent6 || '70AD47';
  const hlink = colors.hlink || '0563C1';
  const folHlink = colors.folHlink || '954F72';

  const majorFont = themeConfig.majorFont || 'Calibri Light';
  const minorFont = themeConfig.minorFont || 'Calibri';

  return XML_DECL +
`<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="${themeConfig.name || 'SlideJ Theme'}">
  <a:themeElements>
    <a:clrScheme name="SlideJ">
      <a:dk1><a:srgbClr val="${dk1}"/></a:dk1>
      <a:lt1><a:srgbClr val="${lt1}"/></a:lt1>
      <a:dk2><a:srgbClr val="${dk2}"/></a:dk2>
      <a:lt2><a:srgbClr val="${lt2}"/></a:lt2>
      <a:accent1><a:srgbClr val="${accent1}"/></a:accent1>
      <a:accent2><a:srgbClr val="${accent2}"/></a:accent2>
      <a:accent3><a:srgbClr val="${accent3}"/></a:accent3>
      <a:accent4><a:srgbClr val="${accent4}"/></a:accent4>
      <a:accent5><a:srgbClr val="${accent5}"/></a:accent5>
      <a:accent6><a:srgbClr val="${accent6}"/></a:accent6>
      <a:hlink><a:srgbClr val="${hlink}"/></a:hlink>
      <a:folHlink><a:srgbClr val="${folHlink}"/></a:folHlink>
    </a:clrScheme>
    <a:fontScheme name="SlideJ">
      <a:majorFont><a:latin typeface="${majorFont}"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont>
      <a:minorFont><a:latin typeface="${minorFont}"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont>
    </a:fontScheme>
    <a:fmtScheme name="SlideJ">
      <a:fillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
      </a:fillStyleLst>
      <a:lnStyleLst>
        <a:ln w="6350" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
        <a:ln w="12700" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
        <a:ln w="19050" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
      </a:lnStyleLst>
      <a:effectStyleLst>
        <a:effectStyle><a:effectLst/></a:effectStyle>
        <a:effectStyle><a:effectLst/></a:effectStyle>
        <a:effectStyle><a:effectLst/></a:effectStyle>
      </a:effectStyleLst>
      <a:bgFillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
      </a:bgFillStyleLst>
    </a:fmtScheme>
  </a:themeElements>
  <a:objectDefaults/>
  <a:extraClrSchemeLst/>
</a:theme>`;
}

module.exports = { generateTheme };
