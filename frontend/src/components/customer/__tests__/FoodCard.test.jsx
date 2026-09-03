import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { FoodCard } from '../FoodCard.jsx';
import { CartProvider, useCart } from '../../../context/CartContext.jsx';

const baseItem = {
  id: 1,
  slug: 'chicken-biriyani',
  name: '[Placeholder] Chicken Biriyani',
  description: 'A test description.',
  priceMinor: 24900,
  imageUrl: null,
  dietType: 'non_veg',
  isAvailable: true,
  isPopular: false,
};

function CartProbe() {
  const { itemCount } = useCart();
  return <span data-testid="cart-count">{itemCount}</span>;
}

function renderCard(item) {
  return render(
    <MemoryRouter>
      <CartProvider>
        <FoodCard item={item} />
        <CartProbe />
      </CartProvider>
    </MemoryRouter>,
  );
}

describe('FoodCard', () => {
  it('renders the name, price, and dietary mark', () => {
    renderCard(baseItem);
    expect(screen.getByText(baseItem.name)).toBeInTheDocument();
    expect(screen.getByText('₹249')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Non-Vegetarian' })).toBeInTheDocument();
  });

  it('never shows a stray "0" for a falsy-but-defined numeric/boolean field (regression test)', () => {
    // isPopular: false previously rendered a literal "0" because the raw
    // SQLite integer 0 isn't a real boolean — see PR history.
    const { container } = renderCard({ ...baseItem, isPopular: false });
    expect(container.textContent).not.toMatch(/(^|\s)0(\s|$)/);
  });

  it('shows the Popular ribbon only when isPopular is true', () => {
    renderCard({ ...baseItem, isPopular: true });
    expect(screen.getByText('Popular')).toBeInTheDocument();
  });

  it('clicking Add to Cart adds exactly one of the item to the cart', async () => {
    const user = userEvent.setup();
    renderCard(baseItem);
    await user.click(screen.getByRole('button', { name: 'Add to Cart' }));
    expect(screen.getByTestId('cart-count')).toHaveTextContent('1');
  });

  it('shows "Sold Out" and disables adding when the item is unavailable', () => {
    renderCard({ ...baseItem, isAvailable: false });
    expect(screen.getByText('Sold Out')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unavailable' })).toBeDisabled();
  });
});
