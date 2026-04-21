export default function LoadingSpinner() {
    return(
        <div className="mt-5 flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-firm-orange border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="mt-4 font-['Montserrat_Alternates'] text-gray-600">Загрузка</p>
            </div>
        </div>
    )
}