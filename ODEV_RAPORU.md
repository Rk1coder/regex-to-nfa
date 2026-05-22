# Ödev Raporu: Regex'ten NFA'ya Dönüşüm

## 1. Konu

Bu ödevde düzenli ifadelerin Thompson yapım yöntemi kullanılarak NFA'ya
dönüştürülmesi ele alınmıştır. Uygulama web arayüzü üzerinden regex girişi
alır ve oluşan NFA'yı grafik ve geçiş tablosu olarak gösterir.

## 2. Amaç

Projenin amacı, teorik olarak anlatılan regex ve NFA dönüşümünü çalışan bir
uygulama üzerinde göstermektir. Böylece kullanıcı hem sonucu hem de yapım
adımlarını takip edebilir.

## 3. Yöntem

Regex ifadesi önce parser tarafından parçalanır. Parser, operatör önceliğini
dikkate alarak ifadeyi ağaç yapısına dönüştürür. Daha sonra Thompson yöntemi
uygulanır.

Kullanılan temel kurallar:

- Tek sembol için iki durum ve bir geçiş oluşturulur.
- Konkatenasyonda bir parçanın kabul durumu diğer parçanın başlangıcına
  epsilon geçişiyle bağlanır.
- Birleşimde yeni başlangıç ve kabul durumları eklenir.
- Kleene yıldızında tekrar ve boş geçiş için epsilon bağlantıları eklenir.
- Artı operatöründe en az bir tekrar zorunlu tutulur.
- Opsiyonel operatöründe ifade atlanabilir hale getirilir.

## 4. Uygulama Akışı

1. Kullanıcı regex ifadesini girer.
2. İfade doğrulanır.
3. Regex soyut söz dizimi ağacına çevrilir.
4. Thompson algoritması ile NFA üretilir.
5. NFA grafiği ve geçiş tablosu ekranda gösterilir.
6. Kullanıcı isterse dönüşüm adımlarını sırayla izler.

## 5. Kullanılan Veri Yapıları

- `NFAState`: Durum bilgisini tutar.
- `NFATransition`: Durumlar arasındaki sembollü veya epsilon geçişlerini tutar.
- `NFA`: Tüm durumları, alfabeteyi, başlangıç durumunu, kabul durumlarını ve
  geçişleri içerir.
- `BuildStep`: Adım adım gösterim için her dönüşüm adımındaki NFA bilgisini
  saklar.

## 6. Sonuç

Proje, girilen düzenli ifadeyi NFA'ya dönüştürerek hem teorik konunun
uygulanmasını hem de görsel olarak incelenmesini sağlar. Grafik ve tablo
gösterimi sayesinde oluşan otomat daha kolay anlaşılır.
