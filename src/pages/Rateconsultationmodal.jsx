import React, { useState } from 'react';
import { X, Star, Check } from 'lucide-react';
import './Modals.css';

const CATEGORIES = ['Career', 'Marriage', 'Health', 'Business', 'Other'];

const TAGS = [
  'Accurate Prediction',
  'Helpful Remedies',
  'Polite Behavior',
  'Good Communication',
  'Detailed Analysis',
  'Fast Response',
];

const RATING_LABELS = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very Good',
  5: 'Excellent Guidance',
};

export default function RateConsultationModal({ onClose, onSkip, onSubmit }) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [category, setCategory] = useState('Career');
  // userText = the portion manually typed by the user (free-form, after any tag prefix)
  const [userText, setUserText] = useState('');
  // tags = quick-select chips; also appear as text inside the textarea
  const [tags, setTags] = useState(['Accurate Prediction']);
  const [anonymous, setAnonymous] = useState(false);

  const activeRating = hoverRating || rating;

  // Build the live textarea value from selected tags + user's own text
  const buildTextareaValue = (currentTags, currentUserText) => {
    const tagPart = currentTags.join(', ');
    if (tagPart && currentUserText) return `${tagPart} - ${currentUserText}`;
    if (tagPart) return tagPart;
    return currentUserText;
  };

  const textareaValue = buildTextareaValue(tags, userText);

  // When user types in the textarea, strip the tag prefix to isolate free-form text
  const handleTextareaChange = (e) => {
    const raw = e.target.value;
    const tagPart = tags.join(', ');
    const separator = tagPart ? `${tagPart} - ` : '';

    if (separator && raw.startsWith(separator)) {
      // User typed after the tag prefix — keep their text
      setUserText(raw.slice(separator.length));
    } else if (separator && raw.startsWith(tagPart)) {
      // Partial separator (user deleted the " - " part), keep their text after tag part
      setUserText(raw.slice(tagPart.length).replace(/^[\s\-]+/, ''));
    } else {
      // Tags were removed from textarea or user rewrote everything — store as userText
      setUserText(raw);
    }
  };

  const toggleTag = (tag) => {
    setTags((prev) => {
      const next = prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : [...prev, tag];
      return next;
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card modal-card--wide modal-card--compact">
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <h2 className="modal-title">How was your experience?</h2>
        <p className="modal-subtitle">
          Your feedback helps us and our experts improve.
        </p>

        <div className="star-row" style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
          {[1, 2, 3, 4, 5].map((i) => {
            const filled = i <= activeRating;
            return (
              <button
                key={i}
                type="button"
                className="star-btn"
                onClick={() => setRating(i)}
                onMouseEnter={() => setHoverRating(i)}
                onMouseLeave={() => setHoverRating(0)}
                aria-label={`Rate ${i} star${i > 1 ? 's' : ''}`}
                style={{
                  border: 'none',
                  background: 'transparent',
                  padding: 2,
                  cursor: 'pointer',
                  lineHeight: 0,
                  display: 'inline-flex',
                }}
              >
                <Star
                  size={26}
                  strokeWidth={1.5}
                  color={filled ? '#f5a623' : '#d8d5cf'}
                  fill={filled ? '#f5a623' : 'none'}
                />
              </button>
            );
          })}
        </div>
        {activeRating > 0 && (
          <p className="rating-label">{RATING_LABELS[activeRating]}</p>
        )}

        <p className="field-label">What was this consultation about?</p>
        <div className="pill-row">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`pill ${category === cat ? 'pill--active' : ''}`}
              onClick={() => setCategory(cat)}
            >
              {cat}
              {category === cat && <Check size={14} className="pill-check" />}
            </button>
          ))}
        </div>

        <p className="field-label">Write your review (optional)</p>
        <div className="textarea-wrap">
          <textarea
            className="review-textarea"
            placeholder="Share your experience..."
            maxLength={300}
            value={textareaValue}
            onChange={handleTextareaChange}
            style={{ resize: 'none' }}
          />
          <span className="char-count">{textareaValue.length}/300</span>
        </div>

        <div className="tag-row">
          {TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`tag ${tags.includes(tag) ? 'tag--active' : ''}`}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={anonymous}
            onChange={(e) => setAnonymous(e.target.checked)}
          />
          Submit as anonymous
        </label>

        <div className="modal-actions" style={{ display: 'flex', gap: 12 }}>
          <button
            className="btn btn--outline"
            onClick={onSkip}
            style={{
              flex: 0.85,
              padding: '13px 18px',
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              background: '#ffffff',
              color: '#1a1a1f',
              border: '1px solid #e9e6e2',
            }}
          >
            Skip
          </button>
          <button
            className="btn btn--primary"
            onClick={() => {
              // finalReview is the full composed value visible in the textarea
              const finalReview = textareaValue;

              console.log('Final Review:', finalReview);

              onSubmit?.({
                rating,
                category,
                review: finalReview,
                tags,
                anonymous,
              });
            }}
            style={{
              flex: 1.15,
              padding: '13px 18px',
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              background: '#9c2954',
              color: '#ffffff',
              border: '1px solid transparent',
            }}
          >
            Submit Review
          </button>
        </div>
      </div>
    </div>
  );
}