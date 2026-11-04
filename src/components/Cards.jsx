import React from 'react';
import { Heart, Plus, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useShop } from '../context/ShopContext.jsx';
import { formatMileage, formatPrice } from '../data/inventory.js';

export function VehicleCard({ vehicle, compact = false }) {
  const { favorites, toggleFavorite } = useShop();
  const saved = favorites.includes(vehicle.id);
  return (
    <article className={`product-card vehicle-card${compact ? ' compact' : ''}`}>
      <div className="card-image-wrap">
        <Link to={`/vehicles/${vehicle.id}`} aria-label={`View ${vehicle.title}`}>
          <img src={vehicle.images[0]} alt={`${vehicle.title} exterior`} loading="lazy" />
        </Link>
        <span className={`condition-badge ${vehicle.condition.toLowerCase()}`}>{vehicle.condition}</span>
        <button
          type="button"
          className={`favorite-button${saved ? ' saved' : ''}`}
          onClick={() => toggleFavorite(vehicle.id)}
          aria-label={saved ? `Remove ${vehicle.title} from saved vehicles` : `Save ${vehicle.title}`}
        >
          <Heart fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="card-content">
        <h3><Link to={`/vehicles/${vehicle.id}`}>{vehicle.title}</Link></h3>
        <div className="vehicle-facts">
          <span>{vehicle.year}</span>
          <span>{formatMileage(vehicle.mileage)}</span>
          <span>{vehicle.fuel || 'Fuel on request'}</span>
          <span>{vehicle.transmission || 'Transmission on request'}</span>
        </div>
        <div className="card-bottom">
          <strong className="price">{formatPrice(vehicle.price)}</strong>
          <Link className="btn btn-outline btn-small" to={`/vehicles/${vehicle.id}`}>View Details</Link>
        </div>
      </div>
    </article>
  );
}

export function PartCard({ part, compact = false }) {
  const { addToCart, favorites, toggleFavorite } = useShop();
  const saved = favorites.includes(part.id);
  const compatibility = part.compatibleMakes.length
    ? `${part.compatibleMakes.join(', ')} ${part.compatibleModels.join(', ')}`
    : 'Compatibility confirmation required';
  return (
    <article className={`product-card part-card${compact ? ' compact' : ''}`}>
      <div className="card-image-wrap part-image">
        <Link to={`/auto-parts/${part.id}`} aria-label={`View ${part.name}`}>
          <img src={part.images[0]} alt={part.name} loading="lazy" />
        </Link>
        <span className={`condition-badge ${part.condition.toLowerCase()}`}>{part.condition}</span>
        <button
          type="button"
          className={`favorite-button${saved ? ' saved' : ''}`}
          onClick={() => toggleFavorite(part.id)}
          aria-label={saved ? `Remove ${part.name} from saved parts` : `Save ${part.name}`}
        >
          <Heart fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="card-content">
        <span className="category-label">{part.category}</span>
        <h3><Link to={`/auto-parts/${part.id}`}>{part.name}</Link></h3>
        <p className="compatibility">Fits: {compatibility}</p>
        <p className="part-number">Part no: {part.partNumber || 'On request'}</p>
        <div className="availability-dot"><span />{part.availability}</div>
        <div className="card-bottom stacked-mobile">
          <strong className="price">{formatPrice(part.price)}</strong>
          <div className="mini-actions">
            <Link className="btn btn-outline btn-small" to={`/auto-parts/${part.id}`}>View Product</Link>
            {!compact && <button className="square-action" type="button" onClick={() => addToCart(part.id)} aria-label={`Add ${part.name} to cart`}><ShoppingCart size={18} /><Plus size={12} /></button>}
          </div>
        </div>
      </div>
    </article>
  );
}
