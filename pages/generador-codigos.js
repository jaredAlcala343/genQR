'use client'
import { useState, useEffect, useMemo, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import styles from './generador.module.css';

export default function GeneradorCodigos() {
  const [productos, setProductos] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitsPerLabel, setUnitsPerLabel] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [labelStyle, setLabelStyle] = useState('modern');
  const qrContainerRef = useRef(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/productos');
        
        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!Array.isArray(data)) {
          throw new Error('La respuesta no es un array');
        }
        
        setProductos(data);
        setError(null);
      } catch (err) {
        console.error('Error al obtener productos:', err);
        setError(err.message);
        setProductos([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return productos;
    const term = searchTerm.toLowerCase();
    return productos.filter(p => 
      p.CNOMBREPRODUCTO.toLowerCase().includes(term) || 
      p.CCODIGOPRODUCTO.toLowerCase().includes(term)
    );
  }, [productos, searchTerm]);

  const selectedProductData = useMemo(() => {
    return (
      productos.find(p => p.CCODIGOPRODUCTO === selectedProduct) ||
      filteredProducts.find(p => p.CCODIGOPRODUCTO === selectedProduct) ||
      null
    );
  }, [productos, filteredProducts, selectedProduct]);

  const generateProfessionalLabelsPDF = async () => {
    if (!selectedProductData) return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm'
    });

    const config = {
      modern: {
        labelWidth: 80,      // más pequeño
        labelHeight: 38,     // más pequeño
        qrSize: 22,          // más pequeño
        bgColor: [255, 255, 255],
        borderColor: [220, 220, 220],
        titleColor: [34, 34, 34],
        codeColor: [26, 86, 219],
        codeBg: [243, 244, 246],
        unitsColor: [5, 150, 105],
        unitsBg: [230, 249, 240],
        fontSizeTitle: 18,   // más grande
        fontSizeCode: 16,    // más grande
        fontSizeUnits: 14,   // más grande
        padding: 4,
        codeLabel: "COD",
        unitsLabel: "UDS",
        titleFont: 'Arial',
        textFont: 'Arial'
      },
      classic: {
        labelWidth: 80,      // más pequeño
        labelHeight: 38,     // más pequeño
        qrSize: 22,          // más pequeño
        bgColor: [245, 245, 245],
        borderColor: [200, 200, 200],
        titleColor: [34, 34, 34],
        codeColor: [26, 86, 219],
        codeBg: [243, 244, 246],
        unitsColor: [5, 150, 105],
        unitsBg: [230, 249, 240],
        fontSizeTitle: 16,   // más grande
        fontSizeCode: 14,    // más grande
        fontSizeUnits: 12,   // más grande
        padding: 4,
        codeLabel: "CÓDIGO",
        unitsLabel: "UNIDADES",
        titleFont: 'Arial',
        textFont: 'Arial'
      }
    }[labelStyle];

    const {
      labelWidth,
      labelHeight,
      qrSize,
      bgColor,
      borderColor,
      titleColor,
      codeColor,
      codeBg,
      unitsColor,
      unitsBg,
      fontSizeTitle,
      fontSizeCode,
      fontSizeUnits,
      padding,
      codeLabel,
      unitsLabel,
      titleFont,
      textFont
    } = config;

    const labelsPerRow = Math.floor((doc.internal.pageSize.getWidth() - 2) / labelWidth);
    let x = 10;
    let y = 15;
    let count = 0;

    const qrDataUrls = await Promise.all(
      Array.from({ length: quantity }).map(() =>
        QRCode.toDataURL(selectedProductData.CCODIGOPRODUCTO, { width: qrSize * 4, margin: 0 })
      )
    );

    for (let i = 0; i < quantity; i++) {
      if (count > 0 && count % labelsPerRow === 0) {
        x = 10;
        y += labelHeight + 10;
      }

      if (y + labelHeight > doc.internal.pageSize.getHeight() - 15) {
        doc.addPage();
        x = 10;
        y = 15;
        count = 0;
      }

      // Fondo de la etiqueta
      doc.setFillColor(...bgColor);
      doc.setDrawColor(...borderColor);
      doc.roundedRect(x, y, labelWidth, labelHeight, 5, 5, 'FD');

      // Borde interior
      doc.setDrawColor(220, 220, 220);
      doc.roundedRect(x + 1, y + 1, labelWidth - 2, labelHeight - 2, 4, 4);

      // Ajuste dinámico basado en contenido
      let dynamicQrSize = qrSize;
      let dynamicPadding = padding;
      let textBlockWidth = labelWidth - dynamicQrSize - dynamicPadding * 3.5;

      // Reducción proporcional para nombres largos
      let fontSizeTitleAdjusted = fontSizeTitle;
      let fontSizeCodeAdjusted = fontSizeCode;
      let fontSizeUnitsAdjusted = fontSizeUnits;

      // Posición del QR
      const qrX = x + dynamicPadding;
      const qrY = y + (labelHeight - dynamicQrSize) / 2;
      doc.addImage(qrDataUrls[i], 'PNG', qrX, qrY, dynamicQrSize, dynamicQrSize);

      // Área de texto
      const textX = qrX + dynamicQrSize + dynamicPadding;
      let textY = y + fontSizeTitleAdjusted - 4; // Sube el bloque de texto 4mm

      // Nombre del producto (ajuste de tamaño si es necesario)
      doc.setFont(titleFont, 'bold');
      doc.setFontSize(fontSizeTitleAdjusted);
      let productName = selectedProductData.CNOMBREPRODUCTO;
      while (doc.getTextWidth(productName) > textBlockWidth && fontSizeTitleAdjusted > 8) {
        fontSizeTitleAdjusted -= 0.5;
        doc.setFontSize(fontSizeTitleAdjusted);
      }
      doc.setTextColor(...titleColor);
      doc.text(productName, textX, textY, { maxWidth: textBlockWidth });

      // Código del producto (sin fondo)
      const codeY = textY + fontSizeTitleAdjusted + 4;
      const codeText = `${codeLabel}: ${selectedProductData.CCODIGOPRODUCTO}`;
      doc.setFont(textFont, 'bold');
      doc.setFontSize(fontSizeCodeAdjusted);
      let displayCode = codeText;
      while (doc.getTextWidth(displayCode) > textBlockWidth - 8 && fontSizeCodeAdjusted > 8) {
        fontSizeCodeAdjusted -= 0.5;
        doc.setFontSize(fontSizeCodeAdjusted);
      }
      doc.setTextColor(...codeColor);
      doc.text(displayCode, textX, codeY + 2, { maxWidth: textBlockWidth - 8 });

      // Unidades (sin fondo)
      const unitsY = codeY + fontSizeCodeAdjusted ;
      const unitsText = `${unitsLabel}: ${unitsPerLabel}`;
      doc.setFont(textFont, 'normal');
      doc.setFontSize(fontSizeUnitsAdjusted);
      let displayUnits = unitsText;
      while (doc.getTextWidth(displayUnits) > textBlockWidth - 8 && fontSizeUnitsAdjusted > 8) {
        fontSizeUnitsAdjusted -= 0.5;
        doc.setFontSize(fontSizeUnitsAdjusted);
      }
      doc.setTextColor(...unitsColor);
      doc.text(displayUnits, textX, unitsY + 2, { maxWidth: textBlockWidth - 8 });

      x += labelWidth + 10;
      count++;
    }

    doc.save(`etiquetas_${selectedProductData.CCODIGOPRODUCTO}_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.titulo}>Generador de Etiquetas con QR</h1>
      
      {loading && <p className={styles.loading}>Cargando productos...</p>}
      {error && <p className={styles.error}>Error: {error}</p>}
      
      <div className={styles.controls}>
        <div className={styles.searchContainer}>
          <label className={styles.label}>
            Buscar producto:
            <input
              type="text"
              placeholder="Nombre o código del producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
              disabled={loading || error}
            />
          </label>
        </div>

        <label className={styles.label}>
          Seleccionar producto:
          <select 
            value={selectedProduct} 
            onChange={(e) => setSelectedProduct(e.target.value)}
            disabled={loading || error || filteredProducts.length === 0}
            className={styles.select}
          >
            <option value="">{filteredProducts.length === 0 ? 'No hay productos disponibles' : 'Seleccione un producto'}</option>
            {selectedProduct && !filteredProducts.some(p => p.CCODIGOPRODUCTO === selectedProduct) && selectedProductData && (
              <option value={selectedProduct}>
                {selectedProductData.CNOMBREPRODUCTO} ({selectedProductData.CCODIGOPRODUCTO})
              </option>
            )}
            {filteredProducts.map(p => (
              <option key={p.CCODIGOPRODUCTO} value={p.CCODIGOPRODUCTO}>
                {p.CNOMBREPRODUCTO} ({p.CCODIGOPRODUCTO})
              </option>
            ))}
          </select>
        </label>
        
        <div className={styles.inputGroup}>
          <label className={styles.label}>
            Cantidad de etiquetas:
            <input
              type="number"
              min="1"
              max="500"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className={styles.input}
              disabled={!selectedProduct}
            />
          </label>
          
          <label className={styles.label}>
            Unidades por etiqueta:
            <input
              type="number"
              min="1"
              max="9999"
              value={unitsPerLabel}
              onChange={e => setUnitsPerLabel(Math.max(1, parseInt(e.target.value) || 1))}
              className={styles.input}
              disabled={!selectedProduct}
            />
          </label>
          
          <label className={styles.label}>
            Estilo de etiqueta:
            <select
              value={labelStyle}
              onChange={(e) => setLabelStyle(e.target.value)}
              className={styles.select}
            >
              <option value="modern">Moderno</option>
              <option value="classic">Clásico</option>
            </select>
          </label>
        </div>

        <button 
          onClick={generateProfessionalLabelsPDF}
          disabled={!selectedProduct || quantity <= 0}
          className={styles.pdfButton}
        >
          Generar {quantity} Etiqueta{quantity !== 1 ? 's' : ''}
        </button>
      </div>
      
      <div className={styles.previewSection}>
        <h3>Vista Previa</h3>
        {selectedProductData && (
          <div className={`${styles.labelPreview} ${styles[labelStyle]}`} ref={qrContainerRef}>
            <div className={styles.qrWrapper}>
              <div className={styles.qrBorder}>
                <QRCodeCanvas 
                  value={selectedProductData.CCODIGOPRODUCTO} 
                  size={120}
                  level="H"
                  includeMargin={false}
                />
              </div>
            </div>
            <div className={styles.labelContent}>
              <h4 className={styles.productName}>{selectedProductData.CNOMBREPRODUCTO}</h4>
              <div className={styles.details}>
                <span className={styles.productCode}>
                  {labelStyle === 'modern' ? 'COD: ' : 'CÓDIGO: '}{selectedProductData.CCODIGOPRODUCTO}
                </span>
                <span className={styles.unitsPerLabel}>
                  {labelStyle === 'modern' ? 'UDS: ' : 'UNIDADES: '}{unitsPerLabel}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}