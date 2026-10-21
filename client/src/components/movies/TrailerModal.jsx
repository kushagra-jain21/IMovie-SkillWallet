import React from 'react';
import { X } from 'lucide-react';

export const TrailerModal = ({ isOpen, onClose, trailerUrl, movieTitle }) => {
  if (!isOpen) return null;

  // Transform standard YouTube URL to embed URL if needed
  let embedUrl = trailerUrl;
  if (trailerUrl && trailerUrl.includes('youtube.com/watch?v=')) {
    const videoId = trailerUrl.split('v=')[1]?.split('&')[0];
    embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  } else if (trailerUrl && trailerUrl.includes('youtu.be/')) {
    const videoId = trailerUrl.split('youtu.be/')[1]?.split('?')[0];
    embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  }

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1060 }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content bg-dark border-secondary border-opacity-50 text-light shadow-lg rounded-4 overflow-hidden">
          <div className="modal-header border-secondary border-opacity-25 py-3">
            <h5 className="modal-title fw-bold text-truncate">{movieTitle} — Official Trailer</h5>
            <button type="button" className="btn btn-sm btn-outline-secondary rounded-circle" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
          <div className="modal-body p-0">
            <div className="ratio ratio-16x9">
              {embedUrl ? (
                <iframe
                  src={embedUrl}
                  title={`${movieTitle} Trailer`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              ) : (
                <div className="d-flex align-items-center justify-content-center text-muted">
                  Trailer not available for this movie.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
