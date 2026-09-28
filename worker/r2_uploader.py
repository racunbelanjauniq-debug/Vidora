import os
import mimetypes
import boto3
from botocore.config import Config
from pathlib import Path

class R2Uploader:
    def __init__(self, account_id=None, access_key_id=None, secret_access_key=None, bucket_name=None, public_url_domain=None):
        self.account_id = account_id or os.getenv("R2_ACCOUNT_ID")
        self.access_key_id = access_key_id or os.getenv("R2_ACCESS_KEY_ID")
        self.secret_access_key = secret_access_key or os.getenv("R2_SECRET_ACCESS_KEY")
        self.bucket_name = bucket_name or os.getenv("R2_BUCKET_NAME")
        self.public_url_domain = (public_url_domain or os.getenv("R2_PUBLIC_DOMAIN", "")).rstrip("/")

        if not all([self.account_id, self.access_key_id, self.secret_access_key, self.bucket_name]):
            raise ValueError("Kredensial Cloudflare R2 belum lengkap! Cek file .env Anda.")

        endpoint_url = f"https://{self.account_id}.r2.cloudflarestorage.com"
        self.s3_client = boto3.client(
            service_name="s3",
            endpoint_url=endpoint_url,
            aws_access_key_id=self.access_key_id,
            aws_secret_access_key=self.secret_access_key,
            config=Config(signature_version="s3v4")
        )

    def upload_file(self, local_path, destination_key=None):
        local_file = Path(local_path)
        if not local_file.exists():
            raise FileNotFoundError(f"File {local_path} tidak ditemukan!")

        if not destination_key:
            destination_key = f"videos/{local_file.name}"

        content_type, _ = mimetypes.guess_type(str(local_file))
        content_type = content_type or "application/octet-stream"

        print(f"[R2] Mengunggah {local_file.name} ke Cloudflare R2 (key: {destination_key})...")
        with open(local_file, "rb") as f:
            self.s3_client.upload_fileobj(
                f,
                self.bucket_name,
                destination_key,
                ExtraArgs={"ContentType": content_type}
            )

        if self.public_url_domain:
            final_url = f"{self.public_url_domain}/{destination_key}"
        else:
            final_url = self.s3_client.generate_presigned_url(
                ClientMethod="get_object",
                Params={"Bucket": self.bucket_name, "Key": destination_key},
                ExpiresIn=604800  # 7 hari
            )

        print(f"[R2] Berhasil diunggah! URL: {final_url}")
        return {
            "key": destination_key,
            "url": final_url,
            "size": local_file.stat().st_size
        }
