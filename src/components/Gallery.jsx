import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, X, ZoomIn } from 'lucide-react';

export default function Gallery({ images, alt, badge }) {
  const safeImages = images?.length ? images : [];
  const [index, setIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => setIndex(0), [images]);

  if (!safeImages.length) return <div className="gallery-empty">Image pending</div>;
  const previous = () => setIndex((current) => (current - 1 + safeImages.length) % safeImages.length);
  const next = () => setIndex((current) => (current + 1) % safeImages.length);

  return (
    <>
      <div className="product-gallery">
        {safeImages.length > 1 && (
          <div className="gallery-thumbnails" aria-label="Image thumbnails">
            {safeImages.map((image, imageIndex) => (
              <button className={index === imageIndex ? 'active' : ''} type="button" key={`${image}-${imageIndex}`} onClick={() => setIndex(imageIndex)} aria-label={`View image ${imageIndex + 1}`}>
                <img src={image} alt="" />
              </button>
            ))}
          </div>
        )}
        <div className="gallery-main">
          <img src={safeImages[index]} alt={`${alt} — image ${index + 1}`} />
          {badge && <span className={`gallery-badge ${badge.toLowerCase()}`}>{badge}</span>}
          <button className="gallery-zoom" type="button" onClick={() => setZoomed(true)} aria-label="Zoom image"><ZoomIn /> <span>Zoom</span></button>
          {safeImages.length > 1 && (
            <>
              <button className="gallery-arrow previous" type="button" onClick={previous} aria-label="Previous image"><ChevronLeft /></button>
              <button className="gallery-arrow next" type="button" onClick={next} aria-label="Next image"><ChevronRight /></button>
              <span className="gallery-counter"><Maximize2 size={15} /> {index + 1} / {safeImages.length}</span>
            </>
          )}
        </div>
      </div>
      {zoomed && (
        <div className="image-lightbox" role="dialog" aria-modal="true" aria-label={`${alt} image viewer`}>
          <button className="lightbox-close" type="button" onClick={() => setZoomed(false)} aria-label="Close image viewer"><X /></button>
          {safeImages.length > 1 && <button className="lightbox-arrow previous" type="button" onClick={previous} aria-label="Previous image"><ChevronLeft /></button>}
          <img src={safeImages[index]} alt={`${alt} enlarged — image ${index + 1}`} />
          {safeImages.length > 1 && <button className="lightbox-arrow next" type="button" onClick={next} aria-label="Next image"><ChevronRight /></button>}
          <span className="lightbox-counter">{index + 1} / {safeImages.length}</span>
        </div>
      )}
    </>
  );
}
