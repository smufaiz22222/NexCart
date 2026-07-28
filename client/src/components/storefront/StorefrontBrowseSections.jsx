import DealsSection from './DealsSection';
import TrendingSection from './TrendingSection';
import NewArrivalsSection from './NewArrivalsSection';
import RecommendationsSection from './RecommendationsSection';

export default function StorefrontBrowseSections({
  isBrowsingActive,
  isAuthenticated,
  dealProducts,
  topSelling,
  newArrivals,
  userRecommendedItems,
  isLoadingUserRecs,
  handleProductClick,
  wishlist,
  handleWishlistToggle,
  navigate,
}) {
  if (isBrowsingActive) return null;

  return (
    <>
      <DealsSection dealProducts={dealProducts} handleProductClick={handleProductClick} />

      <TrendingSection
        topSelling={topSelling}
        handleProductClick={handleProductClick}
        wishlist={wishlist}
        handleWishlistToggle={handleWishlistToggle}
        navigate={navigate}
      />

      <NewArrivalsSection
        newArrivals={newArrivals}
        handleProductClick={handleProductClick}
        wishlist={wishlist}
        handleWishlistToggle={handleWishlistToggle}
        navigate={navigate}
      />

      {isAuthenticated && (
        <RecommendationsSection
          userRecommendedItems={userRecommendedItems}
          isLoadingUserRecs={isLoadingUserRecs}
          handleProductClick={handleProductClick}
        />
      )}
    </>
  );
}
