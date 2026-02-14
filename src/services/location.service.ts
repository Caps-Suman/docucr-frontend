export interface ZipCodeDetails {
    city: string;
    stateCode: string;
    country: string;
}

const locationService = {
    lookupZipCode: async (zip: string): Promise<ZipCodeDetails | null> => {
        if (!zip || zip.length !== 5) return null;

        try {
            const response = await fetch(`https://api.zippopotam.us/us/${zip}`);
            if (!response.ok) return null;

            const data = await response.json();
            if (data.places && data.places.length > 0) {
                const place = data.places[0];
                return {
                    city: place['place name'],
                    stateCode: place['state abbreviation'],
                    country: data.country
                };
            }
            return null;
        } catch (error) {
            console.error("Zipcode lookup failed:", error);
            return null;
        }
    }
};

export default locationService;
