'use client'
import { useState, useEffect, useMemo, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import styles from './generador.module.css';
import Image from 'next/image';

export default function GeneradorCodigos() {
  const [productos, setProductos] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitsPerLabel, setUnitsPerLabel] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [labelStyle, setLabelStyle] = useState('cubylam');
  const qrContainerRef = useRef(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/productos');
        if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error('La respuesta no es un array');
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


  /*-------------------------------------------------------------------------------------------------------*/

  const logoUrl = '/logo.png'; // Coloca tu imagen en la carpeta public con este nombre

  const generateProfessionalLabelsPDF = async () => {
    try {
      if (!selectedProductData) return;

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [76.2, 152.4] // 3" x 6" pulgas
      });

      const labelWidth = 152.4;
      const labelHeight = 76.2;
      const qrSize = 30; // tamaño QR
      const padding = 5; 

      const qrDataUrls = await Promise.all(
        Array.from({ length: quantity }).map(() =>
          QRCode.toDataURL(selectedProductData.CCODIGOPRODUCTO, { width: qrSize * 4, margin: 0 })
        )
      );

      // Cargar la imagen del logo como base64
      const getImageBase64 = (url) =>
        fetch(url)
          .then(res => res.blob())
          .then(blob => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          }));

      const logoBase64 = await getImageBase64(logoUrl);

      for (let i = 0; i < quantity; i++) {
        // Fondo y bordes
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(0, 0, 0);
        doc.roundedRect(0, 0, labelWidth, labelHeight, 4, 4, 'FD');

        // Logo desde archivo
        const logoX = labelWidth - 30;  // posición a la derecha
        const logoY = -6;                // parte superior
        const logoWidth = 35;
        const logoHeight = 35;
        doc.addImage(logoBase64, 'PNG', logoX, logoY, logoWidth, logoHeight);


        // QR
        const qrX = padding;
        const qrY = padding + 17;
        doc.addImage(qrDataUrls[i], 'PNG', qrX, qrY, qrSize, qrSize);

        // SIEMPRE restablece el color de texto a negro al inicio de cada etiqueta
        doc.setTextColor(0, 0, 0);
        let textX = qrX + qrSize + padding;
        let textY = padding + 7; //margen superior del texto

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('Nombre:', textX, textY);
        textY += 10;
        doc.setFontSize(16);
        doc.text(selectedProductData.CNOMBREPRODUCTO, textX, textY, { maxWidth: labelWidth - qrSize - padding * 3 });
        
        textY += 18;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Cantidad: `, textX, textY);
        doc.setFont('helvetica', 'normal');
        doc.text(`${unitsPerLabel} pzs`, textX + 28, textY);
        
        textY += 9;
        doc.setFont('helvetica', 'bold');
        doc.text(`Lote: `, textX, textY);
        doc.setFont('helvetica', 'normal');
        doc.text(`000001`, textX + 28, textY);

        textY += 9;
        doc.setFont('helvetica', 'bold');
        doc.text(`Fecha: `, textX, textY);
        doc.setFont('helvetica', 'normal');
        doc.text(new Date().toLocaleDateString('es-MX'), textX + 28, textY);

        // Código inferior con fondo negro (más angosto y centrado) /////////////////////////////////////////
        const barWidth = 155; // ancho del rectángulo negro
        const barX = (labelWidth - barWidth)/2; // lo alineamos a la derecha

        doc.setFillColor(0, 0, 0);
        doc.roundedRect(barX, labelHeight - 11, barWidth, 11, 2, 2, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(
          selectedProductData.CCODIGOPRODUCTO,
          labelWidth / 2, // centrado dentro del rectángulo negro
          labelHeight - 4,
          { align: 'center' }
        );


        // Si no es la última etiqueta, agrega una nueva página
        if (i < quantity - 1) doc.addPage();
      }

      doc.save(`cubylam_${selectedProductData.CCODIGOPRODUCTO}_${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (err) {
      alert("Error al generar PDF: " + err.message);
      console.error(err);
    }
  };

  /*-------------------------------------------------------------------------------------------------------*/


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
              <option value="cubylam">Cubylam</option>
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
            {/* Logo en la etiqueta */}
            <div style={{ width: 120, margin: '0 auto', marginBottom: 8 }}>
              <img
                src="/logo.png"
                alt="Logo Cubylam & Chalet"
                style={{ width: '100%', height: 'auto', objectFit: 'contain' }}
              />
            </div>
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
              <p className={styles.fieldLabel}>Nombre:</p>
              <p className={styles.productName}>{selectedProductData.CNOMBREPRODUCTO}</p>
              <div className={styles.details}>
                <p><span className={styles.fieldLabel}>Cantidad:</span> <span className={styles.fieldValue}>{unitsPerLabel} pzs</span></p>
                <p><span className={styles.fieldLabel}>Lote:</span> <span className={styles.fieldValue}>000001</span></p>
                <p><span className={styles.fieldLabel}>Fecha:</span> <span className={styles.fieldValue}>{new Date().toLocaleDateString('es-MX')}</span></p>
              </div>
              <div className={styles.bottomBar}>
                {selectedProductData.CCODIGOPRODUCTO}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
