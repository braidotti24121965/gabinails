export const dynamic = 'force-dynamic';
import { OnlineBooking } from "@/components/online-booking";
import { getProfessionals } from "@/lib/actions/professionals";
import { getServices } from "@/lib/actions/services";
import { CalendarX2 } from "lucide-react";

export default async function AgendarPage() {
  const professionals = await getProfessionals();
  const allServices = await getServices();
  const services = allServices.filter(s => s.active !== false);
  
  if (services.length === 0 || professionals.length === 0) {
    return (
      <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-lg">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CalendarX2 className="w-8 h-8 text-gray-400" />
          </div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Agenda Indisponível</h1>
          <p className="text-gray-500 text-sm">
            Nossa agenda online está temporariamente indisponível no momento. Por favor, tente novamente mais tarde ou entre em contato conosco.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F4F8] sm:py-8">
      <OnlineBooking professionals={professionals} services={services} />
    </div>
  );
}
